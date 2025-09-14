import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Youtube, Instagram, Linkedin } from "lucide-react"; 
import {
  Home,
  FileText,
  Image,
  Zap,
  Target,
  BarChart3,
  Users,
  Settings,
  MessageSquare,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardQuotaPanel } from "@/components/DashboardQuotaPanel";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const AppSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  const sidebarRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    const target = e.target as Node;

    if (
      sidebarRef.current &&
      !sidebarRef.current.contains(target)
    ) {
      // Collapse only if open
      if (!collapsed) {
        toggleSidebar();
      }
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [collapsed, toggleSidebar]);

  const sections = [
    {
      label: "Main",
      items: [
        { path: "/", icon: Home, label: "Dashboard" },
        { path: "/piq", icon: FileText, label: "PIQ Form" },
      ],
    },
    {
      label: "Tests",
      items: [
        { path: "/ppdt", icon: Image, label: "PPDT Test" },
        { path: "/wat", icon: Zap, label: "WAT Test" },
        { path: "/srt", icon: Target, label: "SRT Test" },
        { path: "/results", icon: BarChart3, label: "Results" },
      ],
    },
    {
      label: "Rooms",
      items: [
        { path: "/rooms/register", icon: Users, label: "Room Register" },
        { path: "/rooms/join", icon: Users, label: "Room Join" },
      ],
    },
    {
      label: "Interview",
      items: [{ path: "/interview", icon: UserCheck, label: "Interview" }],
    },
    {
      label: "Other",
      items: [
        { path: "/subscription", icon: CreditCard, label: "Subscription" },
        { path: "/feedback", icon: MessageSquare, label: "Feedback" },
        { path: "/settings", icon: Settings, label: "Settings" },
      ],
    },
  ];

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "flex items-center gap-3 px-2 py-2 rounded-md bg-sidebar-accent text-sidebar-accent-foreground"
      : "flex items-center gap-3 px-2 py-2 rounded-md hover:bg-sidebar-accent/50";

  return (
    <Sidebar
      ref={sidebarRef}
      collapsible="icon"
      className="border-r border-sidebar-border"
    >
      {/* Brand Section */}
      <SidebarHeader className="flex items-center justify-center px-3 py-3 border-b border-sidebar-border">
        {collapsed ? (
          <div className="text-lg font-bold text-sidebar-foreground">S</div>
        ) : (
          <h1 className="text-lg font-semibold text-sidebar-foreground">
            SSBGPT
          </h1>
        )}
      </SidebarHeader>

      {/* Menu */}
      <SidebarContent className="hide-scrollbar overflow-y-auto">
        {sections.map((section, sectionIndex) => (
          <SidebarGroup key={section.label} className="py-0">
            {!collapsed && (
              <SidebarGroupLabel className="px-2 py-1 text-[11px] font-semibold text-sidebar-foreground/70 uppercase tracking-wide">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.path} className={getNavCls}>
                        <item.icon className="w-4 h-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
              {/* Add Quota Panel after PIQ Form (Main section) */}
              {sectionIndex === 0 && user && !collapsed && (
                <div className="px-2 py-2">
                  <DashboardQuotaPanel />
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

{/* Footer */}
<SidebarFooter className="border-t border-sidebar-border">
  <div className="flex items-center justify-center gap-4 py-3">
    <a
      href="https://www.youtube.com/yourchannel"
      target="_blank"
      rel="noopener noreferrer"
      className="text-sidebar-foreground hover:text-red-500"
    >
      <Youtube className="w-5 h-5" />
    </a>
    <a
      href="https://www.instagram.com/yourprofile"
      target="_blank"
      rel="noopener noreferrer"
      className="text-sidebar-foreground hover:text-pink-500"
    >
      <Instagram className="w-5 h-5" />
    </a>
    <a
      href="https://www.linkedin.com/in/yourprofile"
      target="_blank"
      rel="noopener noreferrer"
      className="text-sidebar-foreground hover:text-blue-500"
    >
      <Linkedin className="w-5 h-5" />
    </a>
  </div>
</SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
