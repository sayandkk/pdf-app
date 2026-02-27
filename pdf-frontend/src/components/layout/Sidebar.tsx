import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileX,
  Merge,
  ScanText,
  Edit3,
  PenTool,
  UserCheck,
  Activity,
  Link,
  Folder,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const mainNavigation = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, adminOnly: true },
  { title: "Document Tools", href: "/tools", icon: FileText, isCategory: true },
];

const toolsNavigation = [
  { title: "PDF to Word", href: "/tools/pdf-to-word", icon: FileText },
  { title: "Word to PDF", href: "/tools/word-to-pdf", icon: FileText },
  { title: "Image to PDF", href: "/tools/image-to-pdf", icon: FileImage },
  { title: "PDF Compression", href: "/tools/compression", icon: FileX },
  { title: "Merge & Split", href: "/tools/merge-split", icon: Merge },
  { title: "OCR Scanner", href: "/tools/ocr", icon: ScanText },
  // { title: "PDF Editor", href: "/tools/editor", icon: Edit3 },
  { title: "E-Signature", href: "/tools/signature", icon: PenTool },
];

const managementNavigation = [
  { title: "User Management", href: "/users", icon: Users, adminOnly: true },
  // { title: "Role Management", href: "/roles", icon: UserCheck, adminOnly: true },
  { title: "Audit Logs", href: "/audit", icon: Activity, adminOnly: true },
  // { title: "Integrations", href: "/integrations", icon: Link, adminOnly: true },
  { title: "Analytics", href: "/analytics", icon: BarChart3, adminOnly: true },
];

const footerNavigation = [
  // { title: "Settings", href: "/settings", icon: Settings },
  // { title: "Help", href: "/help", icon: HelpCircle },
];

export const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const { user } = useAuth();

  // Filter main navigation based on user role
  const filteredMainNavigation = mainNavigation.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  // Filter management navigation based on user role
  const filteredManagementNavigation = managementNavigation.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  const NavItem = ({ item, isNested = false }: { item: any; isNested?: boolean }) => (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
          "hover:bg-blue-50 hover:text-blue-600 text-gray-600",
          isActive && "bg-blue-100 text-blue-600 shadow-sm border border-blue-200",
          isNested && "ml-3",
          isCollapsed && "justify-center px-2"
        )
      }
    >
      <item.icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed && "h-6 w-6")} />
      {!isCollapsed && <span className="font-medium text-sm">{item.title}</span>}
    </NavLink>
  );

  return (
    <div
      className={cn(
        "h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-sm",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-gray-900 text-lg">Document</span>
                <p className="text-xs text-gray-500 -mt-1"></p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              "h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors",
              isCollapsed && "mx-auto"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {filteredMainNavigation.filter(item => !item.isCategory).map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>

        {/* Document Tools */}
        <div className="pt-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2 px-3 mb-2">
              <Folder className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                
              </p>
            </div>
          )}
          <Collapsible open={isToolsOpen} onOpenChange={setIsToolsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 px-3 py-3 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <FileText className={cn("h-5 w-5", isCollapsed && "h-6 w-6")} />
                {!isCollapsed && (
                  <>
                    <span className="font-medium text-sm">Document Tools</span>
                    <ChevronRight className={cn(
                      "h-4 w-4 ml-auto transition-transform duration-200 text-gray-400",
                      isToolsOpen && "rotate-90"
                    )} />
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            {!isCollapsed && (
              <CollapsibleContent className="space-y-1 mt-1">
                {toolsNavigation.map((item) => (
                  <NavItem key={item.href} item={item} isNested />
                ))}
              </CollapsibleContent>
            )}
          </Collapsible>
        </div>

        {/* Management - Only show if user has access to management items */}
        {filteredManagementNavigation.length > 0 && (
          <div className="pt-4">
            {!isCollapsed && (
              <div className="flex items-center gap-2 px-3 mb-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Management
                </p>
              </div>
            )}
            <div className="space-y-1">
              {filteredManagementNavigation.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 space-y-1">
        {footerNavigation.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </div>

      {/* User Info (when expanded) */}
      {!isCollapsed && user && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user.role || 'user'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed user indicator */}
      {isCollapsed && user && (
        <div className="p-2 border-t border-gray-200 flex justify-center">
          <div className="h-8 w-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};