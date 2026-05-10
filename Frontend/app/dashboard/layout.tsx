"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import { Menu, X, LogOut, ChevronDown, ChevronRight, Settings } from "lucide-react"; 
import AiChatbox from "../components/AiChatbox";
import api from '@/lib/api';

// 🌟 NESTED MASTER MENU (Business Modules)
const DYNAMIC_MODULES = [
    {
      category: "Inventory & Stock",
      icon: "📦",
      requiredPerm: "view_inventory",
      items: [
        { name: "Inventory", path: "/dashboard/products", icon: "📦" },
        { name: "Products", path: "/dashboard/products", icon: "🛍️" },
        { name: "Medicines (Stock)", path: "/dashboard/products", icon: "💊" },
        { name: "Yarn Inventory", path: "/dashboard/products", icon: "🧶" },
        { name: "Fabric Stock", path: "/dashboard/products", icon: "🧵" },
        { name: "Groceries Stock", path: "/dashboard/products", icon: "🛒" },
        { name: "Electronics Stock", path: "/dashboard/products", icon: "💻" },
        { name: "Spare Parts", path: "/dashboard/products", icon: "⚙️" }
      ]
    },
    {
      category: "Sales & Orders",
      icon: "🛒",
      requiredPerm: "view_orders",
      items: [
        { name: "Orders", path: "/dashboard/orders", icon: "🛒" },
        { name: "Sales Orders", path: "/dashboard/orders", icon: "🧾" },
        { name: "Prescriptions", path: "/dashboard/orders", icon: "🩺" },
        { name: "Wholesale Orders", path: "/dashboard/orders", icon: "📦" },
        { name: "Warranty Claims", path: "/dashboard/orders", icon: "🛡️" },
        { name: "Service Jobs", path: "/dashboard/orders", icon: "🔧" }
      ]
    },
    {
      category: "Production & Jobs",
      icon: "🏭",
      requiredPerm: "view_dashboard", 
      items: [
        { name: "Production", path: "/dashboard/production", icon: "🏭" },
        { name: "Weaving Jobs", path: "/dashboard/production", icon: "🏭" },
        { name: "Repair Jobs", path: "/dashboard/production", icon: "🛠️" },
        { name: "Mechanics", path: "/dashboard/production", icon: "👨‍🔧" }
      ]
    },
    {
       category: "Misc & Reports",
       icon: "📄",
       requiredPerm: "view_dashboard",
       items: [
          { name: "AI Reports", path: "/dashboard/reports", icon: "📄" },
          { name: "Suppliers", path: "/dashboard/suppliers", icon: "🚚" }
       ]
    }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenuCategory, setOpenMenuCategory] = useState<string | null>(null); 
  
  // Data States
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [userName, setUserName] = useState('Loading...');
  const [userRole, setUserRole] = useState('STAFF'); 
  const [allowedMenus, setAllowedMenus] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]); 

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return; 
    }

    Promise.all([
      api.get('/auth/profile/'), // Updated to match your current auth endpoint
      api.get('/settings/schema/').catch(() => ({ data: { menu_items: [] } })) // Graceful fail if schema not found
    ])
    .then(([profileRes, menuRes]) => {
        const profile = profileRes.data;

        // ==============================================================
        // 🛑 STRICT SECURITY BARRICADE (Direct URL Protection)
        // ==============================================================
        const allowedDashboardRoles = ['SUPERADMIN', 'ADMIN', 'STAFF', 'COMPANY_ADMIN', 'MANAGER'];
        
        if (!allowedDashboardRoles.includes(profile.role)) {
            console.warn("Unauthorized Access Attempt to ERP Dashboard");
            // Agar normal user direct URL dale, usko wapas community me phek do!
            router.push("/community");
            return; // Aage ka code run nahi hoga
        }
        // ==============================================================

        setUserName(profile.first_name || profile.username || profile.email || 'User');
        setUserRole(profile.role || 'STAFF');

        const perms = profile.permissions || [];
        setUserPermissions(perms);
        localStorage.setItem('user_permissions', JSON.stringify(perms));
        localStorage.setItem('user_profile', JSON.stringify(profile));

        const menuData = menuRes.data;
        if (menuData && menuData.menu_items && menuData.menu_items.length > 0) {
            setAllowedMenus(menuData.menu_items);
        } else {
            setAllowedMenus(["Inventory", "Orders"]); 
        }

        setIsAuthorized(true); 
    })
    .catch(err => {
        console.error("Layout fetch error", err);
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

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-blue-600 font-semibold">Loading ERP Securly...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      
      {/* 1. SIDEBAR */}
      <aside className={`${isSidebarOpen ? "w-72" : "w-20"} bg-gray-900 text-white transition-all duration-300 ease-in-out flex flex-col`}>
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          <h1 className={`font-bold text-2xl tracking-wide ${!isSidebarOpen && "hidden"}`}>System Logo</h1>
          {!isSidebarOpen && <span className="font-bold text-xl">SL</span>}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto flex flex-col custom-scrollbar">
            
            {/* 🟢 DASHBOARD & SAMAJ PORTAL */}
            {hasAccess('view_dashboard') && (
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-200 hover:bg-gray-800 hover:text-white rounded-lg transition">
                  <span className="text-xl">🏠</span>
                  <span className={`font-semibold ${!isSidebarOpen && "hidden"}`}>Dashboard</span>
                </Link>
            )}
            
            {/* 🌟 BRIDGE BACK TO COMMUNITY */}
            <Link href="/community" className="flex items-center gap-3 px-4 py-3 text-blue-300 hover:bg-blue-900/50 hover:text-white rounded-lg transition border border-blue-900 shadow-sm mt-2">
                <span className="text-xl">🌐</span>
                <span className={`font-bold ${!isSidebarOpen && "hidden"}`}>Samaj Portal</span>
            </Link>

            <div className="my-2 border-t border-gray-800"></div>

            {/* 📁 GROUP 1: FINANCE & ACCOUNTS */}
            {hasAccess('view_dashboard') && (
                <div className="mb-1">
                    <button onClick={() => toggleMenuCategory('Finance')} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${openMenuCategory === 'Finance' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                        <div className="flex items-center gap-3">
                            <span className="text-xl">💰</span>
                            <span className={`font-medium ${!isSidebarOpen && "hidden"}`}>Finance & Accounts</span>
                        </div>
                        {isSidebarOpen && (openMenuCategory === 'Finance' ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-500" />)}
                    </button>

                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenuCategory === 'Finance' && isSidebarOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                        <div className="ml-11 space-y-1 border-l border-gray-700 pl-2">
                            {['SUPERADMIN', 'ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole) && (
                                <Link href="/dashboard/payments" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                                    <span>💸</span> <span>Payments</span>
                                </Link>
                            )}
                            {['SUPERADMIN', 'ADMIN', 'COMPANY_ADMIN', 'MANAGER'].includes(userRole) && (
                                <Link href="/dashboard/purchases" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                                    <span>📦</span> <span>Purchases</span>
                                </Link>
                            )}
                            {hasAccess('view_expenses') && (
                                <Link href="/dashboard/expenses" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                                    <span>📉</span> <span>Expenses</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 📁 GROUP 2: BUSINESS MODULES (Dynamic) */}
            {DYNAMIC_MODULES.map((module, idx) => {
                const visibleSubItems = module.items.filter(item => allowedMenus.includes(item.name));
                
                if (visibleSubItems.length === 0 || !hasAccess(module.requiredPerm)) {
                    return <div key={`empty-${idx}`} style={{display: 'none'}}></div>;
                }
                
                const isOpen = openMenuCategory === module.category;

                return (
                    <div key={idx} className="mb-1">
                        <button onClick={() => toggleMenuCategory(module.category)} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${isOpen ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{module.icon}</span>
                                <span className={`font-medium ${!isSidebarOpen && "hidden"}`}>{module.category}</span>
                            </div>
                            {isSidebarOpen && (isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-500" />)}
                        </button>

                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen && isSidebarOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                            <div className="ml-11 space-y-1 border-l border-gray-700 pl-2">
                                {visibleSubItems.map((subItem, subIdx) => (
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

            {/* ⚙️ GROUP 3: SYSTEM & TOOLS */}
            <div className="mb-1">
                <button onClick={() => toggleMenuCategory('Tools')} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${openMenuCategory === 'Tools' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                    <div className="flex items-center gap-3">
                        <span className="text-xl"><Settings size={20} className="text-gray-400" /></span>
                        <span className={`font-medium ${!isSidebarOpen && "hidden"}`}>System & Tools</span>
                    </div>
                    {isSidebarOpen && (openMenuCategory === 'Tools' ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-500" />)}
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenuCategory === 'Tools' && isSidebarOpen ? 'max-h-56 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                    <div className="ml-11 space-y-1 border-l border-gray-700 pl-2">
                        {hasAccess('edit_company') && (
                            <Link href="/dashboard/company" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                                <span>🏢</span> <span>Company Info</span>
                            </Link>
                        )}
                        {/* 🌟 ERP STAFF MANAGEMENT */}
                        {['SUPERADMIN', 'ADMIN'].includes(userRole) && (
                            <Link href="/dashboard/staff" className="flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-gray-800 rounded-lg transition">
                                <span>👨‍💼</span> <span>Staff & Roles</span>
                            </Link>
                        )}
                        {hasAccess('edit_company') && (
                            <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                                <span>🔧</span> <span>ERP Settings</span>
                            </Link>
                        )}
                        {['SUPERADMIN', 'ADMIN', 'COMPANY_ADMIN'].includes(userRole) && (
                            <Link href="/dashboard/logs" className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-lg transition">
                                <span>🕵️‍♂️</span> <span>Audit Logs</span>
                            </Link>
                        )}
                        <Link href="/dashboard/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:text-green-300 hover:bg-gray-800 rounded-lg transition">
                            <span>👤</span> <span>My Profile</span>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>

        {/* 🔴 LOGOUT AREA */}
        <div className="p-4 border-t border-gray-800">
          <button onClick={handleLogout} className="flex items-center justify-center space-x-3 text-red-400 hover:text-red-300 hover:bg-gray-800 w-full p-3 rounded-lg transition font-semibold">
            <LogOut size={20} />
            <span className={`${!isSidebarOpen && "hidden"}`}>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white shadow-sm flex items-center px-4 justify-between border-b">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md hover:bg-gray-100 transition text-gray-600">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
                <span className="block font-semibold text-gray-800 leading-tight">{userName}</span>
                <span className="block text-xs text-gray-500 font-bold">{userRole}</span>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-blue-200">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>

      {/* AI Assistant Floating Button */}
      {hasAccess('view_dashboard') && ['SUPERADMIN', 'ADMIN', 'COMPANY_ADMIN', 'MANAGER'].includes(userRole) && (
          <AiChatbox />
      )}
    </div>
  );
}