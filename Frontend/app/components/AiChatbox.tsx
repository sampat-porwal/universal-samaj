"use client";
import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import api from '@/lib/api';

export default function AiChatbox() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when a new message arrives
    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const userMsg = input.trim();
        if (!userMsg) return;

        const currentMessages = [...messages, { text: userMsg, isUser: true }];
        setMessages(currentMessages);
        setInput("");
        setIsLoading(true);

        try {
            const historyPayload = messages.map(msg => ({ 
                role: msg.isUser ? 'user' : 'model', 
                content: msg.text 
            }));

            // Calls your Django AI View
            const res = await api.post('/ai-chat/', { 
                message: userMsg, 
                history: historyPayload 
            });

            setMessages(prev => [...prev, { text: res.data.reply || "No response received.", isUser: false }]);
        } catch (error) {
            setMessages(prev => [...prev, { text: "❌ Connection failed. Check your GEMINI_API_KEY in Django.", isUser: false }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* --- THE CHAT WINDOW --- */}
            {isOpen && (
                <div className="bg-white w-80 sm:w-96 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col mb-4 animate-in slide-in-from-bottom-5 duration-300 h-[500px]">
                    {/* Header */}
                    <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-md z-10">
                        <div className="flex items-center gap-2 font-bold">
                            <Bot size={20} />
                            Universal AI Assistant
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded-md transition">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                                <Bot size={48} className="mb-3 text-blue-500" />
                                <p className="text-sm font-bold text-gray-600">How can I help you today?</p>
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.isUser ? "justify-end" : "justify-start"} w-full`}>
                                    <div className={`flex gap-2 max-w-[85%] ${msg.isUser ? "flex-row-reverse" : "flex-row"}`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.isUser ? "bg-gray-200 text-gray-600" : "bg-blue-600 text-white"}`}>
                                            {msg.isUser ? <User size={12} /> : <Bot size={12} />}
                                        </div>
                                        <div className={`p-3 rounded-xl text-sm font-medium leading-relaxed ${msg.isUser ? "bg-blue-100 text-blue-900 rounded-tr-none" : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm"}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        
                        {isLoading && (
                            <div className="flex gap-2 max-w-[85%]">
                                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mt-1"><Bot size={12} /></div>
                                <div className="p-3 rounded-xl bg-white border border-gray-200 rounded-tl-none shadow-sm flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <form onSubmit={sendMessage} className="flex gap-2">
                            <input 
                                type="text" 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                disabled={isLoading} 
                                placeholder="Ask a question..." 
                                className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
                            />
                            <button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center">
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- THE FLOATING BUBBLE BUTTON --- */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)} 
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition transform hover:scale-105 animate-bounce-short flex items-center justify-center"
                >
                    <MessageSquare size={28} />
                </button>
            )}
        </div>
    );
}