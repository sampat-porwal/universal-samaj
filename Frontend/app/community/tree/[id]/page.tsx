"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Target, ArrowLeft, X, MapPin, Heart, User as UserIcon } from 'lucide-react';
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
    
    // State for Dialog Box (Detailed Info)
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

    // For mouse drag scrolling
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
            setError("Failed to load Family Tree. Please check if the user exists.");
        } finally {
            setLoading(false);
        }
    };

    const getImgUrl = (path: string | null) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
    };

    // Mouse Drag Handlers for easy navigation
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
        const walkX = (x - startX) * 2; 
        scrollRef.current.scrollLeft = scrollLeft - walkX;
        
        const y = e.pageY - scrollRef.current.offsetTop;
        const walkY = (y - startY) * 2;
        scrollRef.current.scrollTop = scrollTop - walkY;
    };

    // =========================================================
    // 🌟 PERFECT PYRAMID NODE (ANTI-SQUISH `shrink-0` APPLIED)
    // =========================================================
    const FamilyNode = ({ 
        node, 
        level, 
        isFirst = true, 
        isLast = true, 
        isOnlyChild = true 
    }: { 
        node: TreeNode, 
        level: number, 
        isFirst?: boolean, 
        isLast?: boolean, 
        isOnlyChild?: boolean 
    }) => {
        const isRoot = level === 1;
        const hasChildren = node.children && node.children.length > 0;
        const [isExpanded, setIsExpanded] = useState(true);

        const isMale = node.gender === 'M';
        const borderColor = isMale ? 'border-blue-500' : 'border-pink-500';
        const textColor = isMale ? 'text-blue-700' : 'text-pink-700';
        const badgeBg = isMale ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800';

        return (
            // 🌟 `shrink-0` ENSURES IT NEVER COMPRESSES! `min-w-[120px]` gives it breathing room.
            <div className="relative flex flex-col items-center pt-8 shrink-0 min-w-[120px] md:min-w-[140px]">
                
                {/* --- 1. HORIZONTAL CONNECTOR LINES (Top Border) --- */}
                {!isOnlyChild && !isRoot && (
                    <>
                        <div className={`absolute top-0 left-0 w-1/2 h-8 border-t-[3px] border-slate-400 ${isFirst ? 'hidden' : 'block'}`}></div>
                        <div className={`absolute top-0 right-0 w-1/2 h-8 border-t-[3px] border-slate-400 ${isLast ? 'hidden' : 'block'}`}></div>
                    </>
                )}

                {/* --- 2. VERTICAL DROP LINE WITH ARROW --- */}
                {!isRoot && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[3px] h-8 bg-slate-400"></div>
                )}
                {!isRoot && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-slate-400"></div>
                )}

                {/* --- 3. THE CIRCULAR NODE UI --- */}
                <div className="relative z-10 flex flex-col items-center group shrink-0">
                    <div 
                        onClick={() => setSelectedNode(node)} 
                        className={`w-16 h-16 rounded-full border-[4px] ${borderColor} shadow-lg flex items-center justify-center overflow-hidden bg-white cursor-pointer hover:scale-110 transition-transform relative z-10 shrink-0`}
                    >
                        {node.image ? (
                            <img src={getImgUrl(node.image)} className="w-full h-full object-cover" alt="" onError={(e) => e.currentTarget.style.display = 'none'} />
                        ) : (
                            <span className={`font-black text-xl ${textColor}`}>{node.name?.charAt(0) || 'U'}</span>
                        )}
                        {isRoot && <div className="absolute bottom-0 bg-yellow-400 text-yellow-900 text-[8px] font-black uppercase w-full text-center py-0.5 tracking-widest">Root</div>}
                    </div>

                    <div className="flex flex-col items-center mt-2 shrink-0">
                        <span className="text-xs font-black text-gray-800 whitespace-nowrap text-center px-2" title={node.name}>
                            {node.name.split(' ')[0]} 
                        </span>
                        {!isRoot && (
                            <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 px-2 py-0.5 rounded-sm shadow-sm whitespace-nowrap ${badgeBg}`}>
                                {isMale ? 'Son' : 'Daughter'}
                            </span>
                        )}
                    </div>

                    {hasChildren && (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="absolute -bottom-8 bg-white border-2 border-slate-300 text-slate-600 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-colors z-20 shrink-0"
                        >
                            <span className="font-black text-sm leading-none mt-[-2px]">{isExpanded ? '-' : '+'}</span>
                        </button>
                    )}
                </div>

                {/* --- 4. THE CHILDREN BRANCHES CONTAINER --- */}
                {hasChildren && isExpanded && (
                    <div className="relative flex flex-col items-center mt-8 shrink-0">
                        <div className="w-[3px] h-8 bg-slate-400 shrink-0"></div>
                        <div className="flex flex-row justify-center shrink-0">
                            {node.children.map((child, i) => (
                                <FamilyNode 
                                    key={child.id}
                                    node={child} 
                                    level={level + 1} 
                                    isFirst={i === 0}
                                    isLast={i === node.children.length - 1}
                                    isOnlyChild={node.children.length === 1}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // =========================================================
    // 🌟 PAGE RENDER
    // =========================================================
    if (loading) return <div className="p-20 text-center font-bold text-blue-500 animate-pulse text-xl">Generating Data Graph...</div>;
    
    if (error || !treeData) return (
        <div className="p-10 text-center flex flex-col items-center">
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200 font-bold max-w-md">
                {error || "Tree not found"}
            </div>
            <button onClick={() => router.back()} className="mt-4 bg-gray-200 px-6 py-2 rounded-xl font-bold">Go Back</button>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-gray-100 font-sans relative overflow-hidden">
            
            {/* 🌟 DIALOG BOX (POP-UP) FOR DETAILED INFO */}
            {selectedNode && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        
                        <div className={`h-24 ${selectedNode.gender === 'M' ? 'bg-blue-600' : 'bg-pink-600'} relative flex justify-end p-4`}>
                            <button onClick={() => setSelectedNode(null)} className="bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 backdrop-blur-md h-fit transition">
                                <X size={20} />
                            </button>
                            <div className={`absolute -bottom-10 left-6 w-20 h-20 rounded-full border-[4px] border-white shadow-lg flex items-center justify-center overflow-hidden bg-white ${selectedNode.gender === 'M' ? 'text-blue-600' : 'text-pink-600'}`}>
                                {selectedNode.image ? (
                                    <img src={getImgUrl(selectedNode.image)} className="w-full h-full object-cover" alt="" onError={(e) => e.currentTarget.style.display = 'none'} />
                                ) : (
                                    <span className="font-black text-3xl">{selectedNode.name?.charAt(0)}</span>
                                )}
                            </div>
                        </div>

                        <div className="pt-12 px-6 pb-6">
                            <h2 className="text-2xl font-black text-gray-900">{selectedNode.name}</h2>
                            <div className="flex items-center gap-2 mt-1 mb-4">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${selectedNode.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                    {selectedNode.gender === 'M' ? 'Male' : 'Female'}
                                </span>
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">ID: {selectedNode.samaj_id}</span>
                            </div>

                            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span className="font-bold">Gotra/Origin:</span> {selectedNode.gotra || 'Not Specified'}
                                </div>
                                
                                {selectedNode.spouses && selectedNode.spouses.length > 0 && (
                                    <div className="pt-3 border-t border-gray-200 mt-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Heart size={12}/> Spouse(s)</p>
                                        <div className="flex flex-col gap-2">
                                            {selectedNode.spouses.map((spouse, idx) => (
                                                <div key={idx} className={`flex items-center gap-3 bg-white p-2 rounded-xl border ${spouse.gender === 'F' ? 'border-pink-200' : 'border-blue-200'} shadow-sm`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden ${spouse.gender === 'F' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                                                        {spouse.image ? <img src={getImgUrl(spouse.image)} className="w-full h-full object-cover" alt=""/> : spouse.name?.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-800">{spouse.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => {
                                        router.push(`/community/tree/${selectedNode.id}`);
                                        setSelectedNode(null);
                                    }}
                                    className="flex-1 bg-gray-900 hover:bg-black text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md"
                                >
                                    <Target size={18}/> Make Root
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
                    <button onClick={() => router.back()} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                            Family Hierarchy <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md ml-2 border border-blue-200">5 Levels</span>
                        </h1>
                        <p className="text-sm text-gray-500 font-bold">Viewing origin point: <span className="text-blue-600">{treeData.name}</span></p>
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-bold px-4 py-2 rounded-xl shadow-sm">
                    🖱️ <strong>Click & Drag</strong> anywhere to move around the tree.
                </div>
            </div>

            {/* 🌟 INFINITE SCROLL CANVAS (DRAG & DROP ENABLED) */}
            <div 
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`flex-1 overflow-auto bg-[#f8fafc] custom-scrollbar relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
                style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
                {/* `w-fit mx-auto min-w-full` guarantees it centers when small, and left-aligns for scroll when huge! */}
                <div className="w-fit min-w-full mx-auto p-10 pb-32 flex justify-center shrink-0">
                    <FamilyNode node={treeData} level={1} />
                </div>
            </div>

        </div>
    );
}