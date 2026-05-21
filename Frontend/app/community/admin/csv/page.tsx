"use client";

import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function CSVManagementPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // 🟢 HANDLE CSV EXPORT
    const handleExport = async () => {
        setIsExporting(true);
        setMessage(null);
        try {
            // Note: Update URL if your api base url requires an '/api/' prefix
            const response = await api.get('/samaj/csv/export/', {
                responseType: 'blob', // Important for file download
            });

            // Create a blob from the response data
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `samaj_profiles_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            setMessage({ text: 'CSV Exported successfully!', type: 'success' });
        } catch (error: any) {
            console.error("Export Error:", error);
            setMessage({ text: 'Failed to export CSV. Check console for details.', type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    // 🟢 HANDLE CSV IMPORT
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
                setMessage({ text: 'Please select a valid .csv file.', type: 'error' });
                setFile(null);
                e.target.value = ''; // reset input
            } else {
                setFile(selectedFile);
                setMessage(null);
            }
        }
    };

    const handleImport = async () => {
        if (!file) {
            setMessage({ text: 'Please select a file first.', type: 'error' });
            return;
        }

        setIsUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/samaj/csv/import/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            setMessage({ 
                text: response.data?.message || 'CSV Imported successfully! Background task started.', 
                type: 'success' 
            });
            setFile(null);
            // Reset file input visually
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error: any) {
            console.error("Import Error:", error);
            setMessage({ 
                text: error.response?.data?.error || 'Failed to import CSV. Ensure format is correct.', 
                type: 'error' 
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-200 pb-6">
                <div className="bg-blue-100 p-3 rounded-xl text-blue-700">
                    <FileSpreadsheet size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">CSV Data Management</h1>
                    <p className="text-gray-500 font-medium mt-1">Export community data or bulk import profiles via CSV.</p>
                </div>
            </div>

            {/* Notification Alert */}
            {message && (
                <div className={`p-4 rounded-xl flex items-start gap-3 font-medium border ${
                    message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                    <p>{message.text}</p>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                
                {/* 📥 EXPORT CARD */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start space-y-6">
                    <div className="bg-green-50 p-4 rounded-full text-green-600 mb-2">
                        <Download size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Download Database</h2>
                        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                            Export the entire Samaj profile database into a standardized CSV format. This is useful for backups or external analysis.
                        </p>
                    </div>
                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="mt-auto flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        {isExporting ? 'Generating CSV...' : 'Export to CSV'}
                    </button>
                </div>

                {/* 📤 IMPORT CARD */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start space-y-6">
                    <div className="bg-blue-50 p-4 rounded-full text-blue-600 mb-2">
                        <Upload size={32} />
                    </div>
                    <div className="w-full">
                        <h2 className="text-xl font-bold text-gray-800">Upload Data</h2>
                        <p className="text-gray-500 text-sm mt-2 leading-relaxed mb-4">
                            Upload a properly formatted CSV file to bulk import or update Samaj profiles. Ensure headers match the required schema.
                        </p>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition relative">
                            <input 
                                type="file" 
                                id="csv-upload"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <FileSpreadsheet size={24} className="text-gray-400 mb-2" />
                            <p className="text-sm font-bold text-gray-700">
                                {file ? file.name : "Click or drag CSV file here"}
                            </p>
                            {!file && <p className="text-xs text-gray-500 mt-1">Maximum file size: 5MB</p>}
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleImport}
                        disabled={!file || isUploading}
                        className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {isUploading ? 'Uploading & Processing...' : 'Upload & Import'}
                    </button>
                </div>

            </div>
        </div>
    );
}