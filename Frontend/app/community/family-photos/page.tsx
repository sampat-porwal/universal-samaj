"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, CheckCircle, ShieldCheck, Users } from 'lucide-react';
import api from '@/lib/api';

export default function FamilyPhotoManagerPage() {
    const [authProfile, setAuthProfile] = useState<any>(null);
    const [samajProfile, setSamajProfile] = useState<any>(null);
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // For Upload handling
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [targetUploadId, setTargetUploadId] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchMyData();
    }, []);

    const fetchMyData = async () => {
        setIsLoading(true);
        try {
            const authRes = await api.get('/auth/profile/');
            setAuthProfile(authRes.data);

            const samajRes = await api.get('/samaj/profiles/');
            const myProfile = samajRes.data.find((p: any) => p.user.username === authRes.data.username);
            setSamajProfile(myProfile);

            if (myProfile) {
                // Build the Core Family List that this user is allowed to edit
                const members: any[] = [];
                
                // Add Self first
                members.push({ type: 'Self', data: myProfile });
                
                // Add Core Family
                if (myProfile.father && myProfile.father.id) members.push({ type: 'Father', data: myProfile.father });
                if (myProfile.mother && myProfile.mother.id) members.push({ type: 'Mother', data: myProfile.mother });
                if (myProfile.spouse && myProfile.spouse.id) {
                        const spouseType = myProfile.spouse.gender === 'M' ? 'Husband' : 'Wife';
                        members.push({ type: spouseType, data: myProfile.spouse });
                    }

                // if (myProfile.spouse && myProfile.spouse.id) members.push({ type: 'Spouse', data: myProfile.spouse });

                if (myProfile.children && Array.isArray(myProfile.children)) {
                    myProfile.children.forEach((child: any) => {
                        const relType = child.gender === 'M' ? 'Son' : 'Daughter';
                        members.push({ type: relType, data: child });
                    });
                }
                
                setFamilyMembers(members);
            }
        } catch (error) { 
            console.error("Failed to load profile", error); 
        } finally { 
            setIsLoading(false); 
        }
    };

    const getImgUrl = (path: string) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
    };

    // 🌟 TRIGGER FILE INPUT FOR SPECIFIC USER
    const initiateUpload = (profileId: number) => {
        setTargetUploadId(profileId);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // 🌟 HANDLE ACTUAL UPLOAD TO BACKEND
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !targetUploadId) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('profile_image', file);

        try {
            // Using the Naya Backend API
            await api.patch(`/samaj/profiles/${targetUploadId}/update_family_photo/`, formData, { 
                headers: { 'Content-Type': 'multipart/form-data' } 
            });
            alert("✅ Photo updated successfully!");
            fetchMyData(); // Refresh to show new photo
        } catch (error: any) { 
            alert(error.response?.data?.error || "❌ Failed to upload photo. You might not have permission.");
        } finally {
            setIsUploading(false);
            setTargetUploadId(null);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        }
    };

    if (isLoading) return <div className="p-10 text-center font-bold text-gray-500 animate-pulse">Loading Family Data...</div>;

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans relative">
            
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                    <ImageIcon className="text-blue-600" size={32}/> Family Photo Manager
                </h1>
                <p className="text-gray-500 font-bold mt-2">Manage profile photos for yourself and your core family members.</p>
            </div>

            {/* HIDDEN FILE INPUT */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
            />

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 font-black text-xl text-gray-800">
                    <Users className="text-blue-500" /> Core Family Members ({familyMembers.length})
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {familyMembers.map((fam, idx) => {
                        const hasPhoto = !!fam.data.profile_image;
                        const isSelf = fam.type === 'Self';

                        return (
                            <div key={idx} className={`p-5 rounded-2xl border-2 transition-all ${isSelf ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'} flex flex-col items-center text-center shadow-sm`}>
                                
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 bg-white px-3 py-1 rounded-full shadow-sm">
                                    {fam.type}
                                </p>

                                {/* AVATAR PREVIEW */}
                                <div className="relative w-24 h-24 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center text-blue-600 font-black text-3xl overflow-hidden mb-4">
                                    <span className="absolute z-0">{fam.data.user?.first_name?.charAt(0) || 'U'}</span>
                                    {hasPhoto && (
                                        <img src={getImgUrl(fam.data.profile_image)} alt="" className="absolute inset-0 w-full h-full object-cover z-10" />
                                    )}
                                    {hasPhoto && (
                                        <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5 z-20 shadow-sm border border-white">
                                            <CheckCircle size={12} className="text-white"/>
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-black text-gray-900 text-lg mb-1">{fam.data.user?.first_name} {fam.data.user?.last_name}</h3>
                                <p className="text-xs font-bold text-gray-500 mb-5">{fam.data.samaj_id}</p>

                                {/* 🌟 SMART UPLOAD BUTTON */}
                                <button 
                                    onClick={() => initiateUpload(fam.data.id)}
                                    disabled={isUploading && targetUploadId === fam.data.id}
                                    className={`w-full py-3 rounded-xl font-black text-sm transition flex items-center justify-center gap-2 shadow-sm ${
                                        hasPhoto 
                                        ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' 
                                        : 'bg-blue-600 border border-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {isUploading && targetUploadId === fam.data.id ? (
                                        <span className="animate-pulse">Uploading...</span>
                                    ) : hasPhoto ? (
                                        <><Camera size={16}/> Update Photo</>
                                    ) : (
                                        <><Camera size={16}/> Upload Photo</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}