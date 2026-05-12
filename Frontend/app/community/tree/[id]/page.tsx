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

    // Drag to scroll logic
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
    // 🌟 THE VERTICAL COUPLE CARD (Fixed Image Size Bug & 15% Bigger)
    // =========================================================
    const CoupleCard = ({ node, isRoot, isActive, onActivate }: { node: TreeNode, isRoot?: boolean, isActive?: boolean, onActivate: () => void }) => {
        const spouse = node.spouses && node.spouses.length > 0 ? node.spouses[0] : null;
        
        // Colors & Borders based on Gender
        const isMale = node.gender === 'M';
        const borderColor = isMale ? 'border-blue-500' : 'border-pink-500';
        const cardBorder = isRoot ? `border-[3px] ${borderColor} shadow-md` : `border-[2px] ${borderColor} shadow-sm hover:shadow-md hover:-translate-y-0.5`;

        return (
            <div className="flex flex-col items-center w-[130px] shrink-0 z-10 transition-all duration-300">
                
                {/* 👨‍👩‍👧 Card Body (Click opens Dialog Profile) */}
                <div 
                    onClick={() => setSelectedNode(node)} 
                    className={`w-[130px] bg-white rounded-xl ${cardBorder} flex flex-col cursor-pointer transition-all`}
                    style={{ overflow: 'hidden' }} // Lock overflow to prevent image breakout
                >
                    {/* Primary User (Top) */}
                    <div className="flex flex-col items-center p-2 bg-gray-50/40">
                        {/* 🌟 STRICT IMAGE LOCK (Solves the Giant Image Bug) */}
                        <div 
                            className={`rounded-full border-[2px] ${borderColor} bg-white flex items-center justify-center shrink-0`}
                            style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', overflow: 'hidden' }}
                        >
                            {node.image ? (
                                <img src={getImgUrl(node.image)} alt={node.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span className="font-bold text-gray-400 text-lg">{node.name.charAt(0)}</span>
                            )}
                        </div>
                        <span className="text-xs font-black text-gray-800 text-center truncate w-full mt-1.5 px-1" title={node.name}>{node.name.split(' ')[0]}</span>
                    </div>

                    {/* Spouse User (Bottom) */}
                    {spouse ? (
                        <div className={`flex flex-col items-center p-2 border-t border-gray-200 bg-gray-50/40`}>
                            <div 
                                className={`rounded-full border-[2px] ${spouse.gender === 'M' ? 'border-blue-400' : 'border-pink-400'} bg-white flex items-center justify-center shrink-0`}
                                style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', overflow: 'hidden' }}
                            >
                                {spouse.image ? (
                                    <img src={getImgUrl(spouse.image)} alt={spouse.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span className="font-bold text-gray-400 text-xs">{spouse.name.charAt(0)}</span>
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-gray-600 text-center truncate w-full mt-1 px-1" title={spouse.name}>{spouse.name.split(' ')[0]}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-3 border-t border-gray-100 bg-gray-100/50" style={{ height: '70px' }}>
                            <span className="text-[9px] font-bold text-gray-400 uppercase text-center leading-tight">No<br/>Spouse</span>
                        </div>
                    )}
                </div>

                {/* 🔘 Action Buttons (Icons Only - Clicks Fixed!) */}
                <div className="flex gap-1.5 mt-2 justify-center w-full relative z-50">
                    
                    {/* Open/Close Leg Toggle */}
                    {node.children && node.children.length > 0 && (
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onActivate(); }} 
                            className={`p-1.5 rounded-md border shadow-sm transition-colors cursor-pointer ${isActive ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`} 
                            title={isActive ? "Active Leg" : "Open Leg"}
                        >
                            {isActive ? <ArrowDown size={16} strokeWidth={3} /> : <ArrowRight size={16} strokeWidth={3} />}
                        </button>
                    )}
                    
                    {/* Make Root Button */}
                    {!isRoot && (
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/community/tree/${node.id}`; }} 
                            className="p-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100 shadow-sm cursor-pointer" 
                            title="Make Root"
                        >
                            <Network size={16} strokeWidth={2.5} />
                        </button>
                    )}

                    {/* View Profile Button */}
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/community/directory/${node.id}`); }} 
                        className="p-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-100 shadow-sm cursor-pointer" 
                        title="View Profile"
                    >
                        <UserIcon size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        );
    };

    // =========================================================
    // 🌟 LEFT-SORTING WATERFALL (Fixes the Click Selection Bug)
    // =========================================================
    const LevelRow = ({ nodes }: { nodes: TreeNode[] }) => {
        // Track the actively opened node ID
        const [activeId, setActiveId] = useState<number | null>(nodes[0]?.id || null);

        // 🌟 NEW LOGIC: Deterministic Sorting to guarantee the active node shifts to index 0 (Left-most)
        const activeNode = nodes.find(n => n.id === activeId) || nodes[0];
        const otherNodes = nodes.filter(n => n.id !== activeNode?.id);
        const sortedNodes = activeNode ? [activeNode, ...otherNodes] : [];

        // Math for 130px width cards
        // Center of a 130px card is 65px. Drop line offset is 64px to center the 2px line.
        const cardCenterOffset = 65; 
        const lineOffset = 64; 

        return (
            <div className="flex flex-col items-start relative w-max transition-all duration-500">
                
                {/* 🌟 1. ROW OF SIBLINGS (Gap 5px) */}
                <div className="flex flex-row gap-[5px] relative pt-[24px] w-max">
                    
                    {/* Horizontal connector line */}
                    {sortedNodes.length > 1 && (
                        <div 
                            className="absolute top-0 h-[2px] bg-slate-400 z-0"
                            style={{ left: `${cardCenterOffset}px`, right: `${cardCenterOffset}px` }}
                        ></div>
                    )}

                    {sortedNodes.map((node) => (
                        <div key={node.id} className="relative flex flex-col items-center w-[130px] shrink-0">
                            {/* Drop line from horizontal axis down to the node */}
                            <div 
                                className="absolute top-0 w-[2px] h-[24px] bg-slate-400 -translate-y-full z-0"
                                style={{ left: `${lineOffset}px` }}
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
                            className="w-[2px] h-[24px] bg-slate-400 relative z-0"
                            style={{ marginLeft: `${lineOffset}px` }}
                        >
                            {/* Downward Arrow pointing to the first child of the next level */}
                            <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-slate-400"></div>
                        </div>
                        
                        {/* Recursive rendering of the next generation */}
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
                    <div className="relative flex flex-col items-center w-[130px] shrink-0">
                        <CoupleCard node={treeData} isRoot={true} isActive={true} onActivate={() => {}} />
                    </div>

                    {/* RENDER ENTIRE CHILDREN WATERFALL */}
                    {treeData.children && treeData.children.length > 0 && (
                        <div className="relative mt-[4px] w-max">
                            <div className="w-[2px] h-[24px] bg-slate-400 ml-[64px] relative z-0">
                                {/* Downward Arrow pointing to 1st Generation */}
                                <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-slate-400"></div>
                            </div>
                            <LevelRow nodes={treeData.children} />
                        </div>
                    )}
                    
                </div>
            </div>

        </div>
    );
}