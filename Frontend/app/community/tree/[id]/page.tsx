"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUp, User as UserIcon, Network, ArrowRight, ArrowDown, X, MapPin } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────
interface SpouseNode {
    id: number;
    name: string;
    image: string | null;
    gender: string;
}

interface TreeNode {
    id: number;
    name: string;
    samaj_id: string;
    image: string | null;
    gender: string;
    gotra: string | null;
    spouses: SpouseNode[];
    children: TreeNode[];
}

// ─── Global active‐child tracker (per‐parent) ────────────────────────────────
// Maps parentId → activeChildId
type ActiveMap = Record<number, number>;

// ─── Image helper ─────────────────────────────────────────────────────────────
const getImgUrl = (path: string | null) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
};

// ─── Name formatter ───────────────────────────────────────────────────────────
const getDisplayName = (name: string, gender: string, isSpouse = false) => {
    if (!name) return '';
    const clean = name.replace(/suwalka/gi, '').trim();
    const suffix = isSpouse
        ? (gender === 'M' ? '(H)' : '(W)')
        : (gender === 'M' ? '(S)' : '(D)');
    return `${clean} ${suffix}`;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CARD_W   = 130;   // px – card width
const CARD_H   = 140;   // px – card height (both halves)
const CARD_GAP = 10;    // px – horizontal gap between siblings
const BTN_H    = 44;    // px – button row height (32px button + 8px mt-2 + 4px buffer)
const V_STEM   = 28;    // px – vertical connector height
const CENTER   = 65;    // px – horizontal center of a card (CARD_W / 2)
// Total vertical space a card+buttons takes before the connector line starts
const CARD_TOTAL_H = CARD_H + BTN_H; // 184px

// ─── ChildrenTooltipBox ───────────────────────────────────────────────────────
const ChildrenTooltipBox: React.FC<{ kids: TreeNode[] }> = ({ kids }) => {
    if (!kids || kids.length === 0) return null;

    return (
        <div
            onMouseDown={e => e.stopPropagation()}
            style={{
                // Floats ABOVE the card, anchored at top-right corner (3px overlap)
                // "bottom: 100%" means the tooltip's bottom edge = card's top edge
                // Then we pull it down 3px so it overlaps the card top-right corner
                position: 'absolute',
                bottom: 'calc(100% - 3px)',  // 3px overlap below tooltip = touching card top
                left: CARD_W - 3,            // 3px overlap on right edge of card
                zIndex: 99999,
                background: 'white',
                border: '2px solid #cbd5e1',
                // Sharp bottom-left corner (touching card), rounded everywhere else
                borderRadius: '12px 12px 12px 4px',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
                padding: '10px 12px',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minWidth: 'max-content',
            }}
        >
            {/* Header */}
            <div style={{
                fontSize: 9, fontWeight: 900, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center',
            }}>
                {kids.length} Child{kids.length !== 1 ? 'ren' : ''}
            </div>

            {/* Horizontal row of child mini-cards */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                {kids.map(kid => {
                    const isMale    = kid.gender === 'M';
                    const accent    = isMale ? '#3b82f6' : '#ec4899';
                    const bgColor   = isMale ? '#eff6ff' : '#fdf2f8';
                    const border    = isMale ? '#bfdbfe' : '#fbcfe8';
                    const cleanName = kid.name.replace(/suwalka/gi, '').trim();
                    const suffix    = isMale ? '(S)' : '(D)';
                    const kidSpouse = kid.spouses?.[0];

                    return (
                        <div key={kid.id} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: 4, padding: '8px 6px 6px',
                            borderRadius: 12, background: bgColor,
                            border: `1.5px solid ${border}`,
                            minWidth: 60, maxWidth: 70,
                        }}>
                            {/* Avatar */}
                            <div style={{
                                width: 38, height: 38, borderRadius: '50%',
                                border: `2.5px solid ${accent}`, background: 'white',
                                overflow: 'hidden', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                boxShadow: `0 2px 6px ${accent}33`,
                            }}>
                                {kid.image
                                    ? <img src={getImgUrl(kid.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    : <span style={{ fontSize: 15, fontWeight: 900, color: accent }}>{cleanName.charAt(0).toUpperCase()}</span>
                                }
                            </div>

                            {/* Name + suffix */}
                            <div style={{
                                fontSize: 10, fontWeight: 800, color: '#1e293b',
                                textAlign: 'center', lineHeight: 1.2, maxWidth: 62, wordBreak: 'break-word',
                            }}>
                                {cleanName.split(' ')[0]}
                                <br />
                                <span style={{ color: accent, fontSize: 9 }}>{suffix}</span>
                            </div>

                            {/* Spouse */}
                            {kidSpouse && (
                                <div style={{
                                    fontSize: 8, fontWeight: 700, color: '#64748b',
                                    textAlign: 'center', borderTop: '1px solid #e2e8f0',
                                    paddingTop: 3, width: '100%',
                                    maxWidth: 62, overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    +{kidSpouse.name.replace(/suwalka/gi, '').trim().split(' ')[0]}
                                </div>
                            )}

                            {/* Grandchildren badge */}
                            {(kid.children?.length ?? 0) > 0 && (
                                <div style={{
                                    fontSize: 7, fontWeight: 800, color: 'white',
                                    background: accent, borderRadius: 20,
                                    padding: '1px 6px', lineHeight: 1.6,
                                }}>
                                    {kid.children.length} ↓
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── CoupleCard ──────────────────────────────────────────────────────────────
interface CoupleCardProps {
    node: TreeNode;
    isRoot?: boolean;
    isActive: boolean;
    hasChildren: boolean;
    expanded: boolean;
    onToggle: () => void;
    onMakeRoot: () => void;
    onViewProfile: () => void;
    onSelect: () => void;
}

const CoupleCard: React.FC<CoupleCardProps> = ({
    node, isRoot, isActive, hasChildren, expanded,
    onToggle, onMakeRoot, onViewProfile, onSelect,
}) => {
    const spouse = node.spouses?.[0] ?? null;
    const isMale = node.gender === 'M';
    const borderColor = isMale ? 'border-blue-500' : 'border-pink-500';
    const borderWidth = isRoot ? 'border-[3px]' : 'border-[2px]';
    const shadow = isRoot ? 'shadow-md' : 'shadow-sm hover:shadow-md';

    // Tooltip: show children preview when hovering a COLLAPSED node that HAS children
    const [hovering, setHovering] = useState(false);
    const showTooltip = hovering && hasChildren && !expanded;

    return (
        <div
            style={{
                width: CARD_W,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
                position: 'relative',
                zIndex: showTooltip ? 99999 : 1,
                overflow: 'visible',   // ← critical: tooltip must escape this div
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            {/* ── Card body ── */}
            <div
                onClick={onSelect}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
                className={`bg-white rounded-xl ${borderWidth} ${borderColor} ${shadow} flex flex-col cursor-pointer transition-all`}
                style={{ width: CARD_W, height: CARD_H, overflow: 'hidden', position: 'relative', zIndex: 2 }}
            >
                {/* Primary person (top half) */}
                <div
                    className="flex flex-col items-center justify-center p-1 bg-gray-50/40"
                    style={{ height: 70, minHeight: 70 }}
                >
                    <div
                        className={`rounded-full border-[2px] ${borderColor} bg-white flex items-center justify-center overflow-hidden`}
                        style={{ width: 40, height: 40, minWidth: 40, minHeight: 40 }}
                    >
                        {node.image
                            ? <img src={getImgUrl(node.image)} alt={node.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span className="font-bold text-gray-400 text-lg">{node.name.charAt(0)}</span>
                        }
                    </div>
                    <span
                        className="text-[11px] font-black text-gray-800 text-center truncate w-full mt-1 px-1 leading-tight"
                        title={node.name}
                    >
                        {getDisplayName(node.name, node.gender, false)}
                    </span>
                </div>

                {/* Spouse (bottom half) */}
                {spouse ? (
                    <div
                        className="flex flex-col items-center justify-center p-1 border-t border-gray-200 bg-gray-50/40"
                        style={{ height: 70, minHeight: 70 }}
                    >
                        <div
                            className={`rounded-full border-[2px] ${spouse.gender === 'M' ? 'border-blue-400' : 'border-pink-400'} bg-white flex items-center justify-center overflow-hidden`}
                            style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
                        >
                            {spouse.image
                                ? <img src={getImgUrl(spouse.image)} alt={spouse.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span className="font-bold text-gray-400 text-xs">{spouse.name.charAt(0)}</span>
                            }
                        </div>
                        <span
                            className="text-[10px] font-bold text-gray-600 text-center truncate w-full mt-1 px-1 leading-tight"
                            title={spouse.name}
                        >
                            {getDisplayName(spouse.name, spouse.gender, true)}
                        </span>
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center justify-center p-1 border-t border-gray-100 bg-gray-100/50"
                        style={{ height: 70, minHeight: 70 }}
                    >
                        <span className="text-[9px] font-bold text-gray-400 uppercase text-center leading-tight">No<br />Spouse</span>
                    </div>
                )}
            </div>

            {/* ── 3 buttons ── */}
            <div
                style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center', width: '100%', position: 'relative', zIndex: 2 }}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
            >
                {/* Toggle branch */}
                <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); if (hasChildren) onToggle(); }}
                    disabled={!hasChildren}
                    title={!hasChildren ? 'No Branches' : expanded ? 'Collapse' : 'Expand'}
                    className={`flex items-center justify-center w-8 h-8 rounded-md border shadow-sm transition-colors ${
                        !hasChildren
                            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                            : expanded
                                ? 'bg-blue-600 border-blue-700 text-white'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <span className="pointer-events-none flex items-center justify-center">
                        {!hasChildren ? <X size={18} strokeWidth={3} /> : expanded ? <ArrowDown size={18} strokeWidth={3} /> : <ArrowRight size={18} strokeWidth={3} />}
                    </span>
                </button>

                {/* Make root */}
                <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); onMakeRoot(); }}
                    title="Make Root"
                    className="flex items-center justify-center w-8 h-8 bg-blue-50 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100 shadow-sm cursor-pointer"
                >
                    <span className="pointer-events-none flex items-center justify-center">
                        <Network size={16} strokeWidth={2.5} />
                    </span>
                </button>

                {/* View profile */}
                <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); onViewProfile(); }}
                    title="View Profile"
                    className="flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-100 shadow-sm cursor-pointer"
                >
                    <span className="pointer-events-none flex items-center justify-center">
                        <UserIcon size={16} strokeWidth={2.5} />
                    </span>
                </button>
            </div>

            {/* ── Children tooltip (hover preview for collapsed nodes) ── */}
            {showTooltip && node.children && node.children.length > 0 && (
                <ChildrenTooltipBox kids={node.children} />
            )}
        </div>
    );
};

// ─── TreeSection ──────────────────────────────────────────────────────────────
// Renders a row of siblings, tracks which sibling is "active" (shows its
// children below), and recurses. All state lives here – no cross-render chaos.

interface TreeSectionProps {
    nodes: TreeNode[];
    depth: number;
    isRootRow?: boolean;
    onSelect: (node: TreeNode) => void;
    onMakeRoot: (id: number) => void;
    onViewProfile: (id: number) => void;
}

const TreeSection: React.FC<TreeSectionProps> = ({
    nodes, depth, isRootRow = false, onSelect, onMakeRoot, onViewProfile,
}) => {
    // Which sibling is currently active (showing its subtree below)?
    const [activeId, setActiveId] = useState<number>(nodes[0]?.id ?? -1);

    // Keep activeId valid if nodes change
    useEffect(() => {
        if (nodes.length > 0 && !nodes.find(n => n.id === activeId)) {
            setActiveId(nodes[0].id);
        }
    }, [nodes]);

    // Per-node expand/collapse for non-root rows
    // Root row: the active node auto-expands; siblings are collapsed but
    // clicking their toggle makes them active.
    const toggle = (node: TreeNode) => {
        if (nodes.length === 1) {
            // single child: just toggle
            setActiveId(prev => (prev === node.id ? -1 : node.id));
        } else {
            // multiple siblings: clicking any sibling's toggle makes it active
            // (and collapses the previously active one)
            setActiveId(prev => (prev === node.id ? -1 : node.id));
        }
    };

    // Put active node first, rest after
    const activeNode  = nodes.find(n => n.id === activeId);
    const otherNodes  = nodes.filter(n => n.id !== activeId);
    const sortedNodes = activeNode ? [activeNode, ...otherNodes] : nodes;

    // Row pixel width (used for horizontal bar)
    const totalW = sortedNodes.length * CARD_W + Math.max(0, sortedNodes.length - 1) * CARD_GAP;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 'max-content', overflow: 'visible' }}>

            {/* ── Sibling row ── */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'row', gap: CARD_GAP, paddingTop: V_STEM, overflow: 'visible' }}>

                {/* Horizontal connector spanning all siblings */}
                {sortedNodes.length > 1 && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: CENTER,
                        right: CENTER,
                        height: 3,
                        background: '#334155',
                        zIndex: -1,
                    }} />
                )}

                {sortedNodes.map((node, idx) => (
                    <div
                        key={node.id}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: CARD_W,
                            flexShrink: 0,
                            zIndex: 1,
                            overflow: 'visible',  // ← tooltip must escape
                        }}
                    >
                        {/* Vertical stem from horizontal bar down to card — zIndex -1 so card covers it */}
                        <div style={{
                            position: 'absolute',
                            left: CENTER - 1.5,
                            top: 0,
                            width: 3,
                            height: V_STEM,
                            background: '#334155',
                            zIndex: -1,
                        }} />

                        <CoupleCard
                            node={node}
                            isRoot={isRootRow && idx === 0}
                            isActive={node.id === activeId}
                            hasChildren={(node.children?.length ?? 0) > 0}
                            expanded={node.id === activeId}
                            onToggle={() => toggle(node)}
                            onMakeRoot={() => onMakeRoot(node.id)}
                            onViewProfile={() => onViewProfile(node.id)}
                            onSelect={() => onSelect(node)}
                        />
                    </div>
                ))}
            </div>

            {/* ── Children of active node ── */}
            {activeNode && (activeNode.children?.length ?? 0) > 0 && (
                <div style={{ position: 'relative', marginTop: BTN_H }}>
                    {/* Vertical stem + arrowhead going down to children row */}
                    <div style={{ width: 3, height: V_STEM, background: '#334155', marginLeft: CENTER - 1.5, position: 'relative' }}>
                        <div style={{
                            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                            width: 0, height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '8px solid #334155',
                        }} />
                    </div>

                    <TreeSection
                        nodes={activeNode.children}
                        depth={depth + 1}
                        onSelect={onSelect}
                        onMakeRoot={onMakeRoot}
                        onViewProfile={onViewProfile}
                    />
                </div>
            )}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FamilyTreePage() {
    const params   = useParams();
    const router   = useRouter();
    const profileId = params.id as string;

    const [treeData,     setTreeData]     = useState<TreeNode | null>(null);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState('');
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
    // Separate UP arrows: one for the root person's parent, one for the spouse's parent
    const [primaryParent, setPrimaryParent] = useState<{ id: number; name: string; label: string } | null>(null);
    const [spouseParent,  setSpouseParent]  = useState<{ id: number; name: string; label: string } | null>(null);

    // ── Smooth drag-to-scroll (native DOM events – no React synthetic event lag) ──
    const scrollRef  = useRef<HTMLDivElement>(null);
    const dragRef    = useRef({ active: false, startX: 0, startY: 0, scrollX: 0, scrollY: 0 });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onMouseDown = (e: MouseEvent) => {
            // Don't start drag on buttons/interactive elements
            if ((e.target as HTMLElement).closest('button, a')) return;
            dragRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                scrollX: el.scrollLeft,
                scrollY: el.scrollTop,
            };
            setIsDragging(true);
            e.preventDefault();
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!dragRef.current.active) return;
            e.preventDefault();
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            el.scrollLeft = dragRef.current.scrollX - dx;
            el.scrollTop  = dragRef.current.scrollY - dy;
        };

        const onMouseUp = () => {
            dragRef.current.active = false;
            setIsDragging(false);
        };

        // Touch support
        const onTouchStart = (e: TouchEvent) => {
            if ((e.target as HTMLElement).closest('button, a')) return;
            dragRef.current = {
                active: true,
                startX: e.touches[0].clientX,
                startY: e.touches[0].clientY,
                scrollX: el.scrollLeft,
                scrollY: el.scrollTop,
            };
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!dragRef.current.active) return;
            const dx = e.touches[0].clientX - dragRef.current.startX;
            const dy = e.touches[0].clientY - dragRef.current.startY;
            el.scrollLeft = dragRef.current.scrollX - dx;
            el.scrollTop  = dragRef.current.scrollY - dy;
        };

        const onTouchEnd = () => { dragRef.current.active = false; };

        // Attach to the element directly (not window) so buttons still work
        el.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: true });
        el.addEventListener('touchend', onTouchEnd);

        return () => {
            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, []);

    // ── Data fetch ────────────────────────────────────────────────────────
    useEffect(() => { fetchTreeData(); }, [profileId]);

    // Reset scroll to top-left when data loads
    useEffect(() => {
        if (treeData && scrollRef.current) {
            scrollRef.current.scrollLeft = 0;
            scrollRef.current.scrollTop  = 0;
        }
    }, [treeData]);

    const fetchTreeData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/samaj/tree/${profileId}/`);
            const targetId = parseInt(profileId);

            const findNode = (node: TreeNode): TreeNode | null => {
                if (node.id === targetId) return node;
                for (const child of (node.children ?? [])) {
                    const found = findNode(child);
                    if (found) return found;
                }
                return null;
            };

            setTreeData(findNode(res.data) ?? res.data);

            // ── Fetch parent info for BOTH root person AND their spouse ──────
            // This gives two independent UP arrows so you can navigate either lineage.
            try {
                const profileRes = await api.get(`/samaj/profiles/${profileId}/`);
                const d = profileRes.data;

                const extractParent = (p: any, label: string) => {
                    if (!p) return null;
                    const firstName = p.user?.first_name || '';
                    const lastName  = p.user?.last_name  || '';
                    const name = `${firstName} ${lastName}`.trim() || p.user?.username || 'Parent';
                    return { id: p.id as number, name, label };
                };

                // Primary person's parent (father preferred, else mother)
                const rootGender = d.gender; // 'M' or 'F'
                const rootLabel  = rootGender === 'M' ? "Father (H)" : "Father (W)";
                setPrimaryParent(
                    extractParent(d.father, rootLabel) ??
                    extractParent(d.mother, rootGender === 'M' ? "Mother (H)" : "Mother (W)") ??
                    null
                );

                // Spouse's parent — fetch each spouse's profile to get their father/mother
                const spouses: any[] = d.spouses ?? [];
                if (spouses.length > 0) {
                    try {
                        const spouseId = spouses[0].id;
                        const spouseRes = await api.get(`/samaj/profiles/${spouseId}/`);
                        const sd = spouseRes.data;
                        const spouseGender = sd.gender;
                        const spouseLabel  = spouseGender === 'M' ? "Father (H)" : "Father (W)";
                        setSpouseParent(
                            extractParent(sd.father, spouseLabel) ??
                            extractParent(sd.mother, spouseGender === 'M' ? "Mother (H)" : "Mother (W)") ??
                            null
                        );
                    } catch {
                        setSpouseParent(null);
                    }
                } else {
                    setSpouseParent(null);
                }

            } catch {
                setPrimaryParent(null);
                setSpouseParent(null);
            }
        } catch (err: any) {
            console.error(err);
            setError('Failed to load Family Tree.');
        } finally {
            setLoading(false);
        }
    };

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleMakeRoot    = (id: number) => { window.location.href = `/community/tree/${id}`; };
    const handleViewProfile = (id: number) => { router.push(`/community/directory/${id}`); };

    // ── Render ────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="p-20 text-center font-bold text-blue-500 animate-pulse text-xl">
            Loading Family Tree…
        </div>
    );

    if (error || !treeData) return (
        <div className="p-10 text-center flex flex-col items-center">
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200 font-bold max-w-md">{error}</div>
            <button onClick={() => router.back()} className="mt-4 bg-gray-200 px-6 py-2 rounded-xl font-bold">Go Back</button>
        </div>
    );

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>

            {/* ── Detail dialog ── */}
            {selectedNode && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`h-24 ${selectedNode.gender === 'M' ? 'bg-blue-600' : 'bg-pink-600'} relative flex justify-end p-4`}>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 backdrop-blur-md h-fit transition"
                            >
                                <X size={20} />
                            </button>
                            <div className={`absolute -bottom-10 left-6 w-20 h-20 rounded-full border-[4px] border-white shadow-lg flex items-center justify-center overflow-hidden bg-white ${selectedNode.gender === 'M' ? 'text-blue-600' : 'text-pink-600'}`}>
                                {selectedNode.image
                                    ? <img src={getImgUrl(selectedNode.image)} className="w-full h-full object-cover" alt="" />
                                    : <span className="font-black text-3xl">{selectedNode.name?.charAt(0)}</span>
                                }
                            </div>
                        </div>
                        <div className="pt-12 px-6 pb-6">
                            <h2 className="text-2xl font-black text-gray-900">{selectedNode.name}</h2>
                            <div className="flex items-center gap-2 mt-1 mb-4">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${selectedNode.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                    {selectedNode.gender === 'M' ? 'Male' : 'Female'}
                                </span>
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                    ID: {selectedNode.samaj_id}
                                </span>
                            </div>
                            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span className="font-bold">Gotra/Origin:</span> {selectedNode.gotra || 'Not Specified'}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleMakeRoot(selectedNode.id)}
                                    className="flex-1 bg-gray-900 hover:bg-black text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md"
                                >
                                    <Network size={18} /> Make Root
                                </button>
                                <Link
                                    href={`/community/directory/${selectedNode.id}`}
                                    className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-black py-3 rounded-xl flex items-center justify-center gap-2 transition text-center shadow-sm"
                                >
                                    <UserIcon size={18} /> View Profile
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Top bar ── */}
            <div className="bg-white border-b border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                            Waterfall Tree
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md ml-2 border border-blue-200">Interactive</span>
                        </h1>
                        <p className="text-sm text-gray-500 font-bold">
                            Viewing origin: <span className="text-blue-600">{treeData.name}</span>
                        </p>
                    </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                    🖱️ Drag / Scroll in any direction · Click <ArrowRight size={14} className="inline bg-white border rounded shadow-sm" /> to expand a branch
                </div>
            </div>

            {/* ── Canvas ── */}
            {/* 
                KEY FIX: 
                - Outer div: flex-1 so it takes remaining height, overflow-hidden just clips visually
                - scrollRef div: w-full h-full overflow-auto — this is the REAL scroll container
                - Inner content div: w-max (shrinks to content width), pb/pr via a spacer div at the end
                  so content is never clipped by the scroll container's edge
            */}
            <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative', background: '#f8fafc' }}>
                <div
                    ref={scrollRef}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        overflow: 'auto',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                    }}
                >
                    {/* 
                        This inner div is w-max so it grows with content horizontally.
                        The spacer div at the bottom adds real scroll room below/right
                        so the deepest level cards + buttons are fully reachable.
                    */}
                    <div style={{ display: 'inline-block', minWidth: '100%', padding: '40px 40px 0 40px' }}>

                        {/* ── UP arrows: primary person's parent (left) + spouse's parent (right) ── */}
                        {(primaryParent || spouseParent) && (() => {
                            // Helper to render one UP arrow pill
                            const UpBtn = ({ p, color }: { p: { id: number; name: string; label: string }, color: string }) => (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <button
                                        onMouseDown={e => e.stopPropagation()}
                                        onTouchStart={e => e.stopPropagation()}
                                        onClick={() => { window.location.href = `/community/tree/${p.id}`; }}
                                        title={`Go to: ${p.name} (${p.label})`}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                                            background: 'white', border: `2px solid ${color}`,
                                            borderRadius: 10, padding: '3px 8px', cursor: 'pointer',
                                            boxShadow: `0 2px 8px ${color}33`, transition: 'all 0.15s',
                                            minWidth: 74, maxWidth: 74,
                                        }}
                                    >
                                        <ArrowUp size={13} color={color} strokeWidth={3} />
                                        <span style={{
                                            fontSize: 8, fontWeight: 900, color, textTransform: 'uppercase',
                                            letterSpacing: '0.03em', width: '100%', overflow: 'hidden',
                                            textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
                                        }}>
                                            {p.name.replace(/suwalka/gi, '').trim()}
                                        </span>
                                        <span style={{
                                            fontSize: 7, fontWeight: 700, color: '#94a3b8',
                                            textTransform: 'uppercase', letterSpacing: '0.03em',
                                        }}>
                                            {p.label}
                                        </span>
                                    </button>
                                    {/* stem from button down to root card */}
                                    <div style={{ width: 2, height: 14, background: color, borderRadius: 2 }} />
                                </div>
                            );

                            const hasBoth = primaryParent && spouseParent;

                            return (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-end',
                                    // If only one arrow, center it over the CARD_W (130px)
                                    // If both, spread them across the card width
                                    width: CARD_W,
                                    justifyContent: hasBoth ? 'space-between' : 'center',
                                    marginBottom: 0,
                                    paddingLeft: hasBoth ? 0 : 0,
                                }}>
                                    {primaryParent && <UpBtn p={primaryParent} color="#6366f1" />}
                                    {spouseParent  && <UpBtn p={spouseParent}  color="#ec4899" />}
                                </div>
                            );
                        })()}

                        {/* Root card */}
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: CARD_W }}>
                            <CoupleCard
                                node={treeData}
                                isRoot
                                isActive
                                hasChildren={(treeData.children?.length ?? 0) > 0}
                                expanded={(treeData.children?.length ?? 0) > 0}
                                onToggle={() => {}}
                                onMakeRoot={() => handleMakeRoot(treeData.id)}
                                onViewProfile={() => handleViewProfile(treeData.id)}
                                onSelect={() => setSelectedNode(treeData)}
                            />
                        </div>

                        {/* Children waterfall */}
                        {(treeData.children?.length ?? 0) > 0 && (
                            <div style={{ position: 'relative', marginTop: BTN_H }}>
                                {/* Vertical stem from root down to first child row */}
                                <div style={{ width: 3, height: V_STEM, background: '#334155', marginLeft: CENTER - 1.5, position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                                        width: 0, height: 0,
                                        borderLeft: '6px solid transparent',
                                        borderRight: '6px solid transparent',
                                        borderTop: '8px solid #334155',
                                    }} />
                                </div>

                                <TreeSection
                                    nodes={treeData.children}
                                    depth={1}
                                    onSelect={setSelectedNode}
                                    onMakeRoot={handleMakeRoot}
                                    onViewProfile={handleViewProfile}
                                />
                            </div>
                        )}

                        {/* ✅ REAL SPACER — gives actual scrollable area below and to the right */}
                        <div style={{ height: 600, width: 1 }} />
                    </div>
                    {/* Right spacer - gives horizontal scroll room */}
                    <div style={{ display: 'inline-block', width: 600, height: 1, verticalAlign: 'top' }} />
                </div>
            </div>
        </div>
    );
}