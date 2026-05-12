"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User as UserIcon, Network, ArrowRight, ArrowDown, X, MapPin } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

// TypeScript Interfaces
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

export default function FamilyTreePage() {
    const params = useParams();
    const router = useRouter();
    const profileId = params.id;

    const [treeData, setTreeData] = useState<TreeNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

    // Mouse Drag Scrolling
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    // Auto-center the massive canvas on load
    useEffect(() => {
        if (treeData && scrollRef.current) {
            const containerWidth = scrollRef.current.clientWidth;
            scrollRef.current.scrollLeft = (10000 - containerWidth) / 2;
        }
    }, [treeData]);

    useEffect(() => {
        fetchTreeData();
    }, [profileId]);

    const fetchTreeData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/samaj/tree/${profileId}/`);
            setTreeData(res.data);
        } catch (err: any) {
            console.error("Failed to load tree", err);
            setError("Failed to load Family Tree.");
        } finally {
            setLoading(false);
        }
    };

    const getImgUrl = (path: string | null) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
        setStartY(e.pageY - scrollRef.current.offsetTop);
        setScrollTop(scrollRef.current.scrollTop);
    };
    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
        const y = e.pageY - scrollRef.current.offsetTop;
        scrollRef.current.scrollTop = scrollTop - (y - startY) * 2;
    };

    // =========================================================
    // 🌟 STRICT VERTICAL COUPLE CARD (Fixed 130x140 size)
    // =========================================================
    const CoupleCard = ({ node, isRoot, isActive, onActivate }: { node: TreeNode, isRoot?: boolean, isActive?: boolean, onActivate: () => void }) => {
        const spouse = node.spouses && node.spouses.length > 0 ? node.spouses[0] : null;
        const hasChildren = node.children && node.children.length > 0;
        
        const isMale = node.gender === 'M';
        const borderColor = isMale ? 'border-blue-500' : 'border-pink-500';
        const cardBorder = isRoot ? `border-[3px] ${borderColor} shadow-md` : `border-[2px] ${borderColor} shadow-sm hover:shadow-md hover:-translate-y-0.5`;

        return (
            <div className="flex flex-col items-center shrink-0 z-10 transition-all duration-300" style={{ width: '130px' }}>
                
                {/* 👨‍👩‍👧 1. CARD BODY (STRICTLY FIXED HEIGHT & WIDTH) */}
                <div 
                    onClick={() => setSelectedNode(node)} 
                    className={`bg-white rounded-xl ${cardBorder} flex flex-col cursor-pointer transition-all shrink-0`}
                    style={{ width: '130px', height: '140px', minWidth: '130px', minHeight: '140px', maxWidth: '130px', maxHeight: '140px', overflow: 'hidden' }}
                >
                    {/* Primary User (Top Half - Exactly 70px) */}
                    <div className="flex flex-col items-center justify-center p-2 bg-gray-50/40 shrink-0" style={{ height: '70px', minHeight: '70px' }}>
                        <div 
                            className={`rounded-full border-[2px] ${borderColor} bg-white flex items-center justify-center shrink-0 overflow-hidden`}
                            style={{ width: '42px', height: '42px', minWidth: '42px', minHeight: '42px' }}
                        >
                            {node.image ? (
                                <img src={getImgUrl(node.image)} alt={node.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span className="font-bold text-gray-400 text-lg">{node.name.charAt(0)}</span>
                            )}
                        </div>
                        <span className="text-xs font-black text-gray-800 text-center truncate w-full mt-1 px-1 leading-tight" title={node.name}>{node.name.split(' ')[0]}</span>
                    </div>

                    {/* Spouse User (Bottom Half - Exactly 70px) */}
                    {spouse ? (
                        <div className={`flex flex-col items-center justify-center p-2 border-t border-gray-200 bg-gray-50/40 shrink-0`} style={{ height: '70px', minHeight: '70px' }}>
                            <div 
                                className={`rounded-full border-[2px] ${spouse.gender === 'M' ? 'border-blue-400' : 'border-pink-400'} bg-white flex items-center justify-center shrink-0 overflow-hidden`}
                                style={{ width: '34px', height: '34px', minWidth: '34px', minHeight: '34px' }}
                            >
                                {spouse.image ? (
                                    <img src={getImgUrl(spouse.image)} alt={spouse.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span className="font-bold text-gray-400 text-xs">{spouse.name.charAt(0)}</span>
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-gray-600 text-center truncate w-full mt-1 px-1 leading-tight" title={spouse.name}>{spouse.name.split(' ')[0]}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-2 border-t border-gray-100 bg-gray-100/50 shrink-0" style={{ height: '70px', minHeight: '70px' }}>
                            <span className="text-[9px] font-bold text-gray-400 uppercase text-center leading-tight">No<br/>Spouse</span>
                        </div>
                    )}
                </div>

                {/* 🔘 2. ALWAYS 3 BUTTONS (Fixed Clicks & Z-Index) */}
                <div className="flex gap-1.5 mt-2 justify-center w-full relative z-50">
                    
                    {/* Button 1: Toggle Leg / Dead End (X) */}
                    <button 
                        type="button"
                        onClick={(e) => { 
                            e.preventDefault(); e.stopPropagation(); 
                            if (hasChildren) onActivate(); 
                        }} 
                        className={`flex items-center justify-center w-8 h-8 rounded-md border shadow-sm transition-colors cursor-pointer ${
                            !hasChildren ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed' :
                            isActive ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`} 
                        disabled={!hasChildren}
                        title={!hasChildren ? "No Branches" : isActive ? "Active Leg" : "Open Leg"}
                    >
                        <span className="pointer-events-none flex items-center justify-center">
                            {!hasChildren ? <X size={16} strokeWidth={3} /> :
                             isActive ? <ArrowDown size={16} strokeWidth={3} /> :
                             <ArrowRight size={16} strokeWidth={3} />}
                        </span>
                    </button>
                    
                    {/* Button 2: Make Root */}
                    <button 
                        type="button"
                        onClick={(e) => { 
                            e.preventDefault(); e.stopPropagation(); 
                            window.location.href = `/community/tree/${node.id}`; 
                        }} 
                        className="flex items-center justify-center w-8 h-8 bg-blue-50 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100 shadow-sm cursor-pointer" 
                        title="Make Root"
                    >
                        <span className="pointer-events-none flex items-center justify-center">
                            <Network size={16} strokeWidth={2.5} />
                        </span>
                    </button>

                    {/* Button 3: View Profile */}
                    <button 
                        type="button"
                        onClick={(e) => { 
                            e.preventDefault(); e.stopPropagation(); 
                            router.push(`/community/directory/${node.id}`); 
                        }} 
                        className="flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-100 shadow-sm cursor-pointer" 
                        title="View Profile"
                    >
                        <span className="pointer-events-none flex items-center justify-center">
                            <UserIcon size={16} strokeWidth={2.5} />
                        </span>
                    </button>
                </div>
            </div>
        );
    };

    // =========================================================
    // 🌟 LEFT-SORTING WATERFALL & DARKER LINES
    // =========================================================
    const LevelRow = ({ nodes }: { nodes: TreeNode[] }) => {
        const [activeId, setActiveId] = useState<number | null>(nodes[0]?.id || null);

        useEffect(() => {
            if (nodes.length > 0 && (!activeId || !nodes.find(n => n.id === activeId))) {
                setActiveId(nodes[0].id);
            }
        }, [nodes]);

        // Left-Sort
        const activeNode = nodes.find(n => n.id === activeId) || nodes[0];
        const otherNodes = nodes.filter(n => n.id !== activeNode?.id);
        const sortedNodes = activeNode ? [activeNode, ...otherNodes] : [];

        // Exact math for 130px cards to perfectly center the 3px thick line
        const centerOffset = 65; 

        return (
            <div className="flex flex-col items-start relative w-max transition-all duration-500">
                
                {/* 🌟 1. ROW OF SIBLINGS (5px Gap) */}
                <div className="flex flex-row gap-[5px] relative pt-[28px] w-max">
                    
                    {/* Horizontal connector line (DARKER bg-slate-700, THICKER h-[3px]) */}
                    {sortedNodes.length > 1 && (
                        <div 
                            className="absolute top-0 h-[3px] bg-slate-700 z-0"
                            style={{ left: `${centerOffset}px`, right: `${centerOffset}px` }}
                        ></div>
                    )}

                    {sortedNodes.map((node) => (
                        <div key={node.id} className="relative flex flex-col items-center w-[130px] shrink-0">
                            {/* Drop line from horizontal axis down to the node */}
                            <div 
                                className="absolute top-0 w-[3px] h-[28px] bg-slate-700 -translate-y-full z-0 -translate-x-1/2"
                                style={{ left: `${centerOffset}px` }}
                            ></div>
                            
                            <CoupleCard 
                                node={node} 
                                isActive={node.id === activeNode?.id} 
                                onActivate={() => setActiveId(node.id)} 
                            />
                        </div>
                    ))}
                </div>

                {/* 🌟 2. CHILDREN OF ACTIVE NODE */}
                {activeNode && activeNode.children && activeNode.children.length > 0 && (
                    <div className="relative mt-[4px] w-max animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* Vertical line dropping from active node to its children row */}
                        <div 
                            className="w-[3px] h-[28px] bg-slate-700 relative z-0 -translate-x-1/2"
                            style={{ marginLeft: `${centerOffset}px` }}
                        >
                            {/* Downward Arrow pointing to the first child */}
                            <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-700"></div>
                        </div>
                        
                        {/* Recursive rendering */}
                        <LevelRow nodes={activeNode.children} />
                    </div>
                )}
            </div>
        );
    };

    // =========================================================
    // 🌟 PAGE RENDER
    // =========================================================
    if (loading) return <div className="p-20 text-center font-bold text-blue-500 animate-pulse text-xl">Loading Graph...</div>;
    
    if (error || !treeData) return (
        <div className="p-10 text-center flex flex-col items-center">
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200 font-bold max-w-md">{error}</div>
            <button onClick={() => router.back()} className="mt-4 bg-gray-200 px-6 py-2 rounded-xl font-bold">Go Back</button>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-gray-50 font-sans relative overflow-hidden">
            
            {/* 🌟 DIALOG BOX FOR DETAILS */}
            {selectedNode && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`h-24 ${selectedNode.gender === 'M' ? 'bg-blue-600' : 'bg-pink-600'} relative flex justify-end p-4`}>
                            <button onClick={() => setSelectedNode(null)} className="bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 backdrop-blur-md h-fit transition"><X size={20} /></button>
                            <div className={`absolute -bottom-10 left-6 w-20 h-20 rounded-full border-[4px] border-white shadow-lg flex items-center justify-center overflow-hidden bg-white ${selectedNode.gender === 'M' ? 'text-blue-600' : 'text-pink-600'}`}>
                                {selectedNode.image ? <img src={getImgUrl(selectedNode.image)} className="w-full h-full object-cover" alt="" /> : <span className="font-black text-3xl">{selectedNode.name?.charAt(0)}</span>}
                            </div>
                        </div>

                        <div className="pt-12 px-6 pb-6">
                            <h2 className="text-2xl font-black text-gray-900">{selectedNode.name}</h2>
                            <div className="flex items-center gap-2 mt-1 mb-4">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${selectedNode.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{selectedNode.gender === 'M' ? 'Male' : 'Female'}</span>
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">ID: {selectedNode.samaj_id}</span>
                            </div>

                            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span className="font-bold">Gotra/Origin:</span> {selectedNode.gotra || 'Not Specified'}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => { window.location.href = `/community/tree/${selectedNode.id}`; }}
                                    className="flex-1 bg-gray-900 hover:bg-black text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md"
                                >
                                    <Network size={18}/> Make Root
                                </button>
                                <Link 
                                    href={`/community/directory/${selectedNode.id}`}
                                    className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-black py-3 rounded-xl flex items-center justify-center gap-2 transition text-center shadow-sm"
                                >
                                    <UserIcon size={18}/> View Profile
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TOP CONTROL PANEL */}
            <div className="bg-white border-b border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition text-gray-600"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                            Waterfall Tree <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md ml-2 border border-blue-200">Interactive</span>
                        </h1>
                        <p className="text-sm text-gray-500 font-bold">Viewing origin point: <span className="text-blue-600">{treeData.name}</span></p>
                    </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                    🖱️ Click <ArrowRight size={14} className="inline bg-white border rounded shadow-sm" /> to shift a branch Left!
                </div>
            </div>

            {/* 🌟 THE CANVAS (Left Aligned Waterfall) */}
            <div 
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`flex-1 overflow-auto bg-[#f8fafc] custom-scrollbar relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
                style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
                <div className="min-w-full w-max flex flex-col items-start p-6 sm:p-10 pb-32">
                    
                    {/* MASTER ROOT (Starts exactly at the Left) */}
                    <div className="relative flex flex-col items-center w-[130px] shrink-0 z-10">
                        <CoupleCard node={treeData} isRoot={true} isActive={true} onActivate={() => {}} />
                    </div>

                    {/* RENDER ENTIRE CHILDREN WATERFALL */}
                    {treeData.children && treeData.children.length > 0 && (
                        <div className="relative mt-[4px] w-max">
                            <div className="w-[3px] h-[28px] bg-slate-700 ml-[65px] relative z-0 -translate-x-1/2">
                                {/* Downward Arrow pointing to 1st Generation */}
                                <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-700"></div>
                            </div>
                            <LevelRow nodes={treeData.children} />
                        </div>
                    )}
                    
                </div>
            </div>

        </div>
    );
}