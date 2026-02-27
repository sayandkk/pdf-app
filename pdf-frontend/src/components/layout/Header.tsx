import { Bell, Search, User, Settings, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onMenuClick} 
          className="lg:hidden rounded-lg hover:bg-gray-100"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">DN</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-gray-900">Document Services</h1>
            <p className="text-xs text-gray-500">Enterprise Document Processing</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-6 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents, tools, or users..."
            className="pl-10 bg-gray-100 border-0 focus:bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative rounded-lg hover:bg-gray-100">
          <Bell className="h-5 w-5 text-gray-600" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white"
          >
            3
          </Badge>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-3 py-2"
            >
              <div className="h-8 w-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                  {user.lastName?.charAt(0)?.toUpperCase() || ''}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 bg-white border border-gray-200 rounded-xl shadow-lg"
          >
            <DropdownMenuLabel className="text-gray-900 font-semibold">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2 text-gray-700 hover:bg-gray-50 rounded-lg">
              <User className="h-4 w-4 text-gray-600" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2 text-gray-700 hover:bg-gray-50 rounded-lg">
              <Settings className="h-4 w-4 text-gray-600" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem 
              className="cursor-pointer flex items-center gap-2 text-red-600 hover:bg-red-50 rounded-lg" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};