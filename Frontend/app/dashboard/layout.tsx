"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import { 
    Menu, X, LogOut, ChevronDown, ChevronRight, Settings, 
    LayoutDashboard, Users, IndianRupee, CreditCard, Building 
} from "lucide-react"; 
import api from '@/lib/api';

import AiChatbox from "../components/AiChatbox";

// UNIVERSAL NESTED MENU FOR TEMPLATE
// 🌟 NOTE: We don't define DYNAMIC_MODULES outside anymore 
// because we need access to 'userRole' to conditionally show "Bulk Import"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenuCategory, setOpenMenuCategory] = useState<string | null>(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 
  
  const [userName, setUserName] = useState('Loading...');
  const [userRole, setUserRole] = useState('USER'); 
  const [userPermissions, setUserPermissions] = useState<string[]>([]); 

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return; 
    }

    api.get('/auth/profile/') 
    .then((res) => {
        const profile = res.data;
        setUserName(profile.first_name || profile.username || 'User');
        setUserRole(profile.role || 'USER');
        
        const perms = profile.permissions || [];
        setUserPermissions(perms);
        localStorage.setItem('user_profile', JSON.stringify(profile));
        
        setIsAuthorized(true); 
    })
    .catch(err => {
        console.error("Auth check failed", err);
        localStorage.clear();
        router.push("/login");
    });
  }, [router]);

  const hasAccess = (requiredPerm: string) => {
    return userPermissions.includes("ALL_ACCESS") || userPermissions.includes(requiredPerm);
  };

  const toggleMenuCategory = (category: string) => {
      if (!isSidebarOpen) setIsSidebarOpen(true);
      setOpenMenuCategory(openMenuCategory === category ? null : category);
  };

  const handleLogout = () => {
    localStorage.clear(); 
    router.push("/login"); 
  };

  // 🌟 DYNAMIC MODULES (Moved inside component so we can check userRole)
  const DYNAMIC_MODULES = [
      {
        category: "Samaj Community",
        icon: <Building size={20} />,
        requiredPerm: "view_dashboard", 
        items: [
          { name: "Samaj Directory", path: "/dashboard/samaj", icon: "📖" },
          // 🌟 NEW: Bulk Import added conditionally ONLY for SUPERADMIN / ADMIN
          ...(userRole === 'SUPERADMIN' || userRole === 'ADMIN' 
              ? [{ name: "Bulk Onboarding", path: "/community/admin/bulk-import", icon: "☁️" }] 
              : []
          )
        ]
      },
      {
        category: "Finance & Accounts",
        icon: <IndianRupee size={20} />,
        requiredPerm: "manage_finances", 
        items: [
          { name: "Universal Cashbook", path: "/dashboard/payments", icon: "💸" }
        ]
      },
      {
        category: "Security & Staff",
        icon: <Users size={20} />,
        requiredPerm: "manage_users", 
        items: [
          { name: "Staff & Roles", path: "/dashboard/staff", icon: "👥" },
          { name: "Audit Logs", path: "/dashboard/logs", icon: "🕵️‍♂️" },
          { name: "Verify Pending", path: "/dashboard/verify", icon: "✅" }
        ]
      },
      {
        category: "Billing & Subscriptions",
        icon: <CreditCard size={20} />,
        requiredPerm: "manage_settings", 
        items: [
          { name: "Upgrade Plan", path: "/upgrade", icon: "⭐" }, 
        ]
      }
  ];

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* 1. SIDEBAR */}
      <aside className={`${isSidebarOpen ? "w-72" : "w-20"} bg-gray-900 text-white transition-all duration-300 ease-in-out flex flex-col`}>
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          <h1 className={`font-bold text-2xl tracking-wide ${!isSidebarOpen && "hidden"}`}>System Logo</h1>
          {!isSidebarOpen && <span className="font-bold text-xl">SL</span>}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto flex flex-col custom-scrollbar">
            
            {hasAccess('view_dashboard') && (
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-200 hover:bg-gray-800 hover:text-white rounded-lg transition">
                    <LayoutDashboard size={20} />
                    <span className={`font-semibold ${!isSidebarOpen && "hidden"}`}>Dashboard</span>
                </Link>
            )}

            <div className="my-2 border-t border-gray-800"></div>

            {/* Dynamic Modules based on Permissions */}
            {DYNAMIC_MODULES.map((module, idx) => {
                if (!hasAccess(module.requiredPerm)) return null;
                
                const isOpen = openMenuCategory === module.category;

                return (
                    <div key={idx} className="mb-1">
                        <button onClick={() => toggleMenuCategory(module.category)} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${isOpen ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-400">{module.icon}</span>
                                <span className={`font-medium ${!isSidebarOpen && "hidden"}`}>{module.category}</span>
                            </div>
                            {isSidebarOpen && (isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-500" />)}
                        </button>

                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen && isSidebarOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                            <div className="ml-11 space-y-1 border-l border-gray-700 pl-2">
                                {module.items.map((subItem, subIdx) => (
                                    <Link key={subIdx} href={subItem.path} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                                        <span>{subItem.icon}</span> <span>{subItem.name}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}

            <div className="my-2 border-t border-gray-800"></div>

            {hasAccess('manage_settings') && (
                <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 text-gray-200 hover:bg-gray-800 hover:text-white rounded-lg transition">
                    <Settings size={20} />
                    <span className={`font-semibold ${!isSidebarOpen && "hidden"}`}>Settings</span>
                </Link>
            )}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={handleLogout} className="flex items-center justify-center space-x-3 text-red-400 hover:text-red-300 hover:bg-gray-800 w-full p-3 rounded-lg transition font-semibold">
            <LogOut size={20} />
            <span className={`${!isSidebarOpen && "hidden"}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white shadow-sm flex items-center px-4 justify-between border-b border-gray-200">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md hover:bg-gray-100 transition text-gray-600">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
                <span className="block font-semibold text-gray-800 leading-tight">{userName}</span>
                <span className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider">{userRole}</span>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>

        <AiChatbox />

      </div>
    </div>
  );
}