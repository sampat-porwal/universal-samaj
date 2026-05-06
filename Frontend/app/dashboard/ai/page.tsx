"use client";
import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User } from "lucide-react";
import api from '@/lib/api';

export default function UniversalAiChat() {
    const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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

            // Make sure your Django urls.py has path('ai-chat/', UniversalAIChatView.as_view())
            const res = await api.post('/ai-chat/', { 
                message: userMsg, 
                history: historyPayload 
            });

            setMessages(prev => [...prev, { text: res.data.reply || "No response received.", isUser: false }]);
        } catch (error) {
            setMessages(prev => [...prev, { text: "❌ Connection failed. Check if your Django server has the GEMINI_API_KEY set.", isUser: false }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 font-sans">
            <div className="bg-gray-50 p-6 border-b border-gray-200 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Sparkles size={24} /></div>
                <h1 className="text-xl font-black text-gray-800">Universal AI Assistant</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                        <Bot size={64} className="text-gray-300 mb-4" />
                        <h2 className="text-xl font-bold text-gray-600">Start a conversation</h2>
                        <p className="text-sm text-gray-400 mt-2 font-medium">I am connected to your Universal Backend.</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.isUser ? "justify-end" : "justify-start"} w-full`}>
                            <div className={`flex gap-3 max-w-[80%] ${msg.isUser ? "flex-row-reverse" : "flex-row"}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.isUser ? "bg-gray-200 text-gray-600" : "bg-blue-600 text-white"}`}>
                                    {msg.isUser ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={`p-4 rounded-xl text-sm leading-relaxed font-medium ${msg.isUser ? "bg-blue-50 text-blue-900 rounded-tr-none border border-blue-100" : "bg-gray-50 text-gray-800 rounded-tl-none border border-gray-200"}`}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"><Bot size={16} /></div>
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 rounded-tl-none flex items-center gap-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <form onSubmit={sendMessage} className="flex gap-3">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} placeholder="Type your message..." className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium transition" />
                    <button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm">
                        Send <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}