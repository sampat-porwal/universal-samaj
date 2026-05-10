"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Network, AlignLeft, Target, ChevronDown, ChevronRight, User, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

// TypeScript Interfaces for the Tree Data
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
    const [viewMode, setViewMode] = useState<'PYRAMID' | 'HORIZONTAL'>('PYRAMID');

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

    // =========================================================
    // 🌟 RECURSIVE COMPONENT TO RENDER EACH NODE & ITS CHILDREN
    // =========================================================
    const FamilyNode = ({ node, level }: { node: TreeNode, level: number }) => {
        const [isExpanded, setIsExpanded] = useState(true);
        const hasChildren = node.children && node.children.length > 0;
        const isHorizontal = viewMode === 'HORIZONTAL';

        // Helper to format the Card
        const renderCard = (person: any, isMain: boolean) => (
            <div className={`relative flex items-center gap-3 p-3 rounded-2xl border-2 shadow-sm transition-all bg-white min-w-[220px] max-w-[260px]
                ${isMain ? 'border-blue-200 hover:border-blue-400' : 'border-pink-200 hover:border-pink-400'}
            `}>
                {/* Profile Image */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg shrink-0 overflow-hidden shadow-inner
                    ${isMain ? 'bg-blue-500' : 'bg-pink-500'}
                `}>
                    {person.image ? (
                        <img src={getImgUrl(person.image)} className="w-full h-full object-cover" alt="" onError={(e) => e.currentTarget.style.display = 'none'} />
                    ) : (
                        person.name?.charAt(0) || 'U'
                    )}
                </div>
                
                {/* Details */}
                <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 truncate" title={person.name}>{person.name}</span>
                    <span className="text-[10px] font-bold text-gray-500">{person.samaj_id || 'Spouse'} {person.gotra ? `• ${person.gotra}` : ''}</span>
                </div>

                {/* Make Root Button (Only for Main Profile, to jump into their tree) */}
                {isMain && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/community/tree/${person.id}`); }}
                        title="Make Root (Center Tree Here)"
                        className="absolute -top-3 -right-3 bg-gray-900 text-white p-1.5 rounded-full hover:bg-blue-600 transition shadow-md z-10"
                    >
                        <Target size={14} />
                    </button>
                )}
            </div>
        );

        return (
            <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center relative`}>
                
                {/* 1. THE COUPLE (Main Node + Spouses side by side) */}
                <div className={`flex flex-row items-center gap-2 relative z-10 bg-gray-50 p-2 rounded-3xl border border-gray-200 shadow-sm ${level === 1 ? 'ring-4 ring-yellow-300 ring-opacity-50' : ''}`}>
                    {renderCard(node, true)}
                    {node.spouses.map((spouse, idx) => (
                        <React.Fragment key={`spouse-${idx}`}>
                            <div className="w-4 h-1 bg-gray-300 rounded-full"></div> {/* Link between husband and wife */}
                            {renderCard(spouse, false)}
                        </React.Fragment>
                    ))}

                    {/* Expand/Collapse Toggle Button */}
                    {hasChildren && (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`absolute bg-white border border-gray-300 text-gray-600 rounded-full p-1 shadow-md hover:bg-gray-100 z-20 
                                ${isHorizontal ? '-right-4 top-1/2 transform -translate-y-1/2' : '-bottom-4 left-1/2 transform -translate-x-1/2'}
                            `}
                        >
                            {isHorizontal ? (isExpanded ? <ChevronRight size={16}/> : <ChevronDown size={16}/>) : (isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>)}
                        </button>
                    )}
                </div>

                {/* 2. THE CHILDREN BRANCHES */}
                {hasChildren && isExpanded && (
                    <>
                        {/* Connecting Line from Parent to Children Wrapper */}
                        <div className={`bg-gray-300 
                            ${isHorizontal ? 'h-px w-8' : 'w-px h-8'}
                        `}></div>

                        {/* Children Wrapper */}
                        <div className={`flex ${isHorizontal ? 'flex-col gap-6 pl-4 border-l-2 border-gray-300 py-4' : 'flex-row gap-6 pt-4 border-t-2 border-gray-300 px-4'} relative`}>
                            {node.children.map((child, idx) => (
                                <div key={`child-${child.id}`} className="relative flex flex-col items-center">
                                    {/* Line down to specific child */}
                                    <div className={`bg-gray-300 absolute 
                                        ${isHorizontal ? 'h-px w-4 -left-4 top-1/2 transform -translate-y-1/2' : 'w-px h-4 -top-4 left-1/2 transform -translate-x-1/2'}
                                    `}></div>
                                    <FamilyNode node={child} level={level + 1} />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };


    // =========================================================
    // 🌟 PAGE RENDER
    // =========================================================
    if (loading) return <div className="p-20 text-center font-bold text-blue-500 animate-pulse text-xl">Generating Family Tree...</div>;
    
    if (error || !treeData) return (
        <div className="p-10 text-center flex flex-col items-center">
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200 font-bold max-w-md">
                {error || "Tree not found"}
            </div>
            <button onClick={() => router.back()} className="mt-4 bg-gray-200 px-6 py-2 rounded-xl font-bold">Go Back</button>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-gray-100 font-sans">
            
            {/* TOP CONTROL PANEL */}
            <div className="bg-white border-b border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                            Family Tree <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md ml-2 border border-blue-200">5 Levels</span>
                        </h1>
                        <p className="text-sm text-gray-500 font-bold">Viewing origin point: <span className="text-blue-600">{treeData.name}</span></p>
                    </div>
                </div>

                {/* TOGGLE SWITCH: Pyramid vs Horizontal */}
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
                    <button 
                        onClick={() => setViewMode('PYRAMID')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${viewMode === 'PYRAMID' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Network size={16} /> Pyramid View
                    </button>
                    <button 
                        onClick={() => setViewMode('HORIZONTAL')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${viewMode === 'HORIZONTAL' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <AlignLeft size={16} /> Horizontal View
                    </button>
                </div>
            </div>

            {/* TREE CANVAS (Drag/Scroll Area) */}
            <div className="flex-1 overflow-auto bg-[#f8fafc] p-10 custom-scrollbar relative" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <div className="min-w-max min-h-max pb-32 pr-32 flex justify-center items-start pt-10">
                    <FamilyNode node={treeData} level={1} />
                </div>
            </div>

        </div>
    );
}