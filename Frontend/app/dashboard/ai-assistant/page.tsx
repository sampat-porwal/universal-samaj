"use client";
import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, FileText, TableIcon, Bot, User } from "lucide-react";
// import axios from "axios";
import api from '@/lib/api';

export default function AiCommandCenterPage() {
    const [messages, setMessages] = useState<{ text: string; isUser: boolean; data?: any }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new message arrives
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 🌟 SAME ENTERPRISE PRINT ENGINE (Full Screen ke liye)
    const handlePrintAiReport = async (reportTitle: string, reportData: any[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert("Please allow popups to print reports.");
        printWindow.document.write('<h2>Generating Professional AI Report... Please wait.</h2>');

        const profileStr = localStorage.getItem('user_profile');
        let companyName = "My Company";
        if (profileStr) {
            const profile = JSON.parse(profileStr);
            companyName = profile?.active_company_name || profile?.company_name || "My Company";
        }

        let settings = { gstin: '', address: '', phone: '', email: '', logo: '' };
        try {
            // const token = localStorage.getItem('access_token');
            // const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/settings/`, {
            //     headers: { Authorization: `Bearer ${token}` }
            // });

            const res = await api.get('/api/settings/');
            if (res.data) settings = res.data;
        } catch (e) { console.error("Could not fetch settings"); }

        const tableHeaders = Object.keys(reportData[0]);
        let tableRowsHtml = '';
        reportData.forEach((row: any) => {
            tableRowsHtml += '<tr>';
            tableHeaders.forEach(header => {
                tableRowsHtml += `<td>${row[header] !== null && row[header] !== undefined ? String(row[header]) : "-"}</td>`;
            });
            tableRowsHtml += '</tr>';
        });

        const html = `
            <html>
            <head>
                <title>${reportTitle}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; max-width: 900px; margin: auto; }
                    .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;}
                    .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; color: #000; }
                    .company-details { font-size: 13px; color: #555; font-weight: bold; margin-top: 5px; line-height: 1.4;}
                    .report-title-box { text-align: right; }
                    .report-title { font-size: 22px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; letter-spacing: 1px; }
                    .report-date { font-size: 12px; color: #666; margin-top: 5px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;}
                    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
                    th { background-color: #f3f4f6; color: #374151; font-weight: bold; text-transform: uppercase;}
                    .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
                    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        ${settings.logo ? `<img src="${settings.logo}" style="max-height: 80px; max-width: 150px; object-fit: contain; border-radius: 8px;" />` : ''}
                        <div>
                            <h1>${companyName}</h1>
                            <div class="company-details">
                                ${settings.address ? `<div>${settings.address}</div>` : ''}
                                ${settings.phone || settings.email ? `<div>Contact: ${settings.phone} | ${settings.email}</div>` : ''}
                                ${settings.gstin ? `<div style="margin-top: 5px;"><strong>GSTIN:</strong> <span style="color:#111827;">${settings.gstin}</span></div>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="report-title-box">
                        <div class="report-title">AI ANALYSIS REPORT</div>
                        <div class="report-date">Generated on: ${new Date().toLocaleString('en-IN')}</div>
                    </div>
                </div>
                <h2 style="text-align: center; text-transform: uppercase; color: #4b5563; margin-bottom: 30px; font-size: 18px;">-- ${reportTitle} --</h2>
                <table>
                    <thead><tr>${tableHeaders.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('')}</tr></thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>
                <div class="footer"><p>Auto-generated by Royal Logic AI Engine based on real-time ERP data.</p></div>
                <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }</script>
            </body>
            </html>
        `;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const sendMessage = async (e?: React.FormEvent, customQuery?: string) => {
        if (e) e.preventDefault();
        
        // 🌟 VALIDATION: Safe Input Trim (Koi khali space nahi bhej payega)
        const userMsg = (customQuery || input).trim();
        if (!userMsg) return;

        // Chat History UI ke liye
        const currentMessages = [...messages, { text: userMsg, isUser: true }];
        setMessages(currentMessages);
        setInput("");
        setIsLoading(true);

        try {
            const token = localStorage.getItem("access_token");
            const profileStr = localStorage.getItem('user_profile');
            const profile = profileStr ? JSON.parse(profileStr) : null;
            const companyId = profile?.active_company_id || profile?.company_id || 1;

            // ==========================================
            // 🔴 OPTION 1: GROQ / Llama-3 (CURRENTLY ACTIVE)
            // ==========================================
            const res = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8001'}/api/ai/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ question: userMsg, company_id: companyId }),
            });
            const data = await res.json();
            
            let aiData: any = null;
            let cleanText: string = "";

            if (res.ok) {
                aiData = data.data || data.results || null;
                cleanText = data.answer;

                if (!aiData && typeof data.answer === 'string') {
                    try {
                        const jsonMatch = data.answer.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                        if (jsonMatch) {
                            aiData = JSON.parse(jsonMatch[0]);
                            cleanText = data.answer.replace(jsonMatch[0], '').trim();
                            if (cleanText === '') cleanText = "Here is the data you requested:";
                        }
                    } catch (err) { }
                }
                setMessages((prev) => [...prev, { text: cleanText, isUser: false, data: aiData }]);
            } else {
                setMessages((prev) => [...prev, { text: "❌ Error: " + (data.detail || "Something went wrong"), isUser: false }]);
            }

            // ==========================================
            // 🔵 OPTION 2: GOOGLE GEMINI (COMMENTED FOR FUTURE)
            // ==========================================
            /*
            const config = { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } };
            const historyPayload = messages.map(msg => ({ role: msg.isUser ? 'user' : 'model', content: msg.text }));
            const payload = { message: userMsg, history: historyPayload };

            const geminiRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/ai-chat/`, payload, config);
            
            let aiData = null;
            let cleanText = geminiRes.data.reply || "No response received.";

            try {
                const jsonMatch = cleanText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                if (jsonMatch) {
                    aiData = JSON.parse(jsonMatch[0]);
                    cleanText = cleanText.replace(jsonMatch[0], '').trim();
                    if (cleanText === '') cleanText = "Here is the data you requested:";
                }
            } catch (err) { }

            setMessages((prev) => [...prev, { text: cleanText, isUser: false, data: aiData }]);
            */

        } catch (error: any) {
            setMessages((prev) => [...prev, { text: "❌ Connection failed with AI Engine.", isUser: false }]);
        } finally {
            setIsLoading(false);
        }
    };

    // const sendMessage = async (e?: React.FormEvent, customQuery?: string) => {
    //     if (e) e.preventDefault();
    //     const userMsg = customQuery || input;
    //     if (!userMsg.trim()) return;

    //     setMessages((prev) => [...prev, { text: userMsg, isUser: true }]);
    //     setInput("");
    //     setIsLoading(true);

    //     try {
    //         const token = localStorage.getItem("access_token");
    //         const profileStr = localStorage.getItem('user_profile');
    //         const profile = profileStr ? JSON.parse(profileStr) : null;
    //         const companyId = profile?.active_company_id || profile?.company_id || 1;

    //         const res = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8001'}/api/ai/ask`, {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    //             body: JSON.stringify({ question: userMsg, company_id: companyId }),
    //         });

    //         const data = await res.json();

    //         if (res.ok) {
    //             let aiData = data.data || data.results || null;
    //             let cleanText = data.answer;

    //             if (!aiData && typeof data.answer === 'string') {
    //                 try {
    //                     const jsonMatch = data.answer.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    //                     if (jsonMatch) {
    //                         aiData = JSON.parse(jsonMatch[0]);
    //                         cleanText = data.answer.replace(jsonMatch[0], '').trim();
    //                         if (cleanText === '') cleanText = "Here is the data you requested:";
    //                     }
    //                 } catch (err) { }
    //             }
    //             setMessages((prev) => [...prev, { text: cleanText, isUser: false, data: aiData }]);
    //         } else {
    //             setMessages((prev) => [...prev, { text: "❌ Error: " + (data.detail || "Something went wrong"), isUser: false }]);
    //         }
    //     } catch (error) {
    //         setMessages((prev) => [...prev, { text: "❌ Connection failed with AI Gateway.", isUser: false }]);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-50 rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            {/* --- HEADER --- */}
            <div className="bg-white p-6 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                        <Sparkles size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800">AI Command Center</h1>
                        <p className="text-sm text-gray-500 font-medium">Chat with your ERP data in natural language</p>
                    </div>
                </div>
            </div>

            {/* --- CHAT AREA --- */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <Bot size={64} className="text-gray-300 mb-4" />
                        <h2 className="text-xl font-bold text-gray-600 mb-2">How can I help you today?</h2>
                        <p className="text-gray-400 mb-8 max-w-md">Try asking me about your sales, pending dues, or stock levels.</p>
                        
                        {/* Quick Prompts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                            <button onClick={() => sendMessage(undefined, "Show me all pending orders")} className="bg-white border border-gray-200 p-4 rounded-xl text-left hover:border-blue-400 hover:shadow-md transition">
                                <span className="block font-bold text-gray-700">Pending Orders</span>
                                <span className="text-xs text-gray-400">View orders that are not delivered</span>
                            </button>
                            <button onClick={() => sendMessage(undefined, "List products with low stock")} className="bg-white border border-gray-200 p-4 rounded-xl text-left hover:border-blue-400 hover:shadow-md transition">
                                <span className="block font-bold text-gray-700">Low Stock Alert</span>
                                <span className="text-xs text-gray-400">Find items that need restocking</span>
                            </button>
                            <button onClick={() => sendMessage(undefined, "What are my total sales this month?")} className="bg-white border border-gray-200 p-4 rounded-xl text-left hover:border-blue-400 hover:shadow-md transition">
                                <span className="block font-bold text-gray-700">Monthly Sales</span>
                                <span className="text-xs text-gray-400">Calculate total revenue generated</span>
                            </button>
                            <button onClick={() => sendMessage(undefined, "Show me list of all parties")} className="bg-white border border-gray-200 p-4 rounded-xl text-left hover:border-blue-400 hover:shadow-md transition">
                                <span className="block font-bold text-gray-700">Client Directory</span>
                                <span className="text-xs text-gray-400">View all your registered parties</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isDataAvailable = msg.data && Array.isArray(msg.data) && msg.data.length > 0;
                        const tableHeaders = isDataAvailable ? Object.keys(msg.data[0]) : [];

                        return (
                            <div key={index} className={`flex ${msg.isUser ? "justify-end" : "justify-start"} w-full`}>
                                <div className={`flex gap-4 max-w-[85%] ${msg.isUser ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.isUser ? "bg-indigo-100 text-indigo-600" : "bg-blue-600 text-white"}`}>
                                        {msg.isUser ? <User size={20} /> : <Bot size={20} />}
                                    </div>
                                    <div className={`p-4 rounded-2xl shadow-sm ${msg.isUser ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"}`}>
                                        {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                                        
                                        {/* FULL SCREEN TABLE VIEW */}
                                        {!msg.isUser && isDataAvailable && (
                                            <div className="mt-4 border border-gray-200 rounded-lg overflow-x-auto bg-white">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 text-gray-600">
                                                        <tr>
                                                            {tableHeaders.map((header, i) => (
                                                                <th key={i} className="p-3 border-b uppercase font-bold text-xs tracking-wider whitespace-nowrap">
                                                                    {header.replace(/_/g, ' ')}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {msg.data.map((row: any, rowIndex: number) => (
                                                            <tr key={rowIndex} className="hover:bg-blue-50/50 transition">
                                                                {tableHeaders.map((col, colIndex) => (
                                                                    <td key={colIndex} className="p-3 whitespace-nowrap text-gray-700">
                                                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* BUTTONS */}
                                        {!msg.isUser && isDataAvailable && (
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <button onClick={() => handlePrintAiReport("AI Analysis Report", msg.data)} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-100 transition border border-blue-200">
                                                    <FileText size={16} /> Print Professional Report
                                                </button>
                                                <button onClick={() => {
                                                    localStorage.setItem("current_ai_report", JSON.stringify(msg.data));
                                                    window.location.href = "/dashboard/ai-reports";
                                                }} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black transition shadow-md">
                                                    <TableIcon size={16} /> Open Full View (Excel/Pagination)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                {isLoading && (
                    <div className="flex gap-4 max-w-[85%]">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center animate-pulse"><Bot size={20} /></div>
                        <div className="p-4 rounded-2xl bg-white border border-gray-200 text-gray-500 rounded-tl-none flex items-center gap-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                            <span className="ml-2 text-sm font-medium">Analyzing data...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* --- INPUT BOX --- */}
            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={sendMessage} className="flex gap-3 max-w-4xl mx-auto">
                    {/* 🌟 VALIDATION: maxLength=1000 add kiya gaya hai */}
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        maxLength={1000}
                        placeholder="Type your question here (e.g. 'Show me low stock items')..."
                        className="flex-1 bg-gray-100 border-none rounded-xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium"
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 rounded-xl font-bold flex items-center gap-2 transition shadow-md">
                        Send <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}