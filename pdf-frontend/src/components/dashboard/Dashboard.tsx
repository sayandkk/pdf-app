import {
  FileText,
  FileImage,
  FileX,
  Merge,
  ScanText,
  Edit3,
  PenTool,
  Upload,
  Download,
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  Zap,
  Cpu,
  HardDrive,
  MemoryStick,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ServiceCard } from "./ServiceCard";
import { StatsCard } from "./StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { dashboardApi } from "@/lib/api";

const services = [
  {
    title: "PDF to Word",
    description: "Convert PDF documents to editable Word format with high accuracy and formatting preservation.",
    icon: FileText,
    color: "primary" as const,
    isPopular: true,
    path: "/tools/pdf-to-word",
  },
  {
    title: "Word to PDF",
    description: "Transform Word documents into secure, professional PDF files with consistent formatting.",
    icon: FileText,
    color: "accent" as const,
    path: "/tools/word-to-pdf",
  },
  {
    title: "Image to PDF",
    description: "Convert images (JPG, PNG, TIFF) into PDF documents with batch processing support.",
    icon: FileImage,
    color: "success" as const,
    path: "/tools/image-to-pdf",
  },
  {
    title: "PDF Compression",
    description: "Reduce PDF file sizes while maintaining quality for easier sharing and storage.",
    icon: FileX,
    color: "warning" as const,
    isPopular: true,
    path: "/tools/compression",
  },
  {
    title: "Merge & Split",
    description: "Combine multiple PDFs or split large documents into smaller, manageable files.",
    icon: Merge,
    color: "primary" as const,
    path: "/tools/merge-split",
  },
  {
    title: "OCR Scanner",
    description: "Extract text from scanned documents and images with advanced optical character recognition.",
    icon: ScanText,
    color: "accent" as const,
    isPopular: true,
    path: "/tools/ocr",
  },
  {
    title: "PDF Editor",
    description: "Edit PDF content with annotations, redactions, watermarks, and text modifications.",
    icon: Edit3,
    color: "success" as const,
    path: "/tools/editor",
  },
  {
    title: "E-Signature",
    description: "Add legally binding electronic signatures to documents with advanced security features.",
    icon: PenTool,
    color: "warning" as const,
    path: "/tools/signature",
  },
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    {
      title: "Documents Processed Today",
      value: "0",
      change: "+0%",
      changeType: "positive" as const,
      icon: FileText,
      color: "primary" as const,
    },
    {
      title: "Active Users",
      value: "0",
      change: "+0%",
      changeType: "positive" as const,
      icon: Users,
      color: "accent" as const,
    },
    {
      title: "Queue Length",
      value: "0",
      change: "+0%",
      changeType: "positive" as const,
      icon: Clock,
      color: "warning" as const,
    },
    {
      title: "Success Rate",
      value: "0%",
      change: "+0%",
      changeType: "positive" as const,
      icon: TrendingUp,
      color: "success" as const,
    },
  ]);
  const [recentJobs, setRecentJobs] = useState<Array<{
    id: string;
    name: string;
    type: string;
    status: 'completed' | 'processing' | 'queued' | 'failed';
    user: string;
    createdAt: string;
  }>>([]);
  const [systemUsage, setSystemUsage] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    storageUsage: 0,
    activeJobs: 0,
    maxJobs: 50,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, recentJobsData, systemUsageData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRecentJobs(),
        dashboardApi.getSystemUsage(),
      ]);

      // Update stats
      setStats([
        {
          title: "Documents Processed Today",
          value: statsData.documentsProcessedToday.toString(),
          change: "+12.3%",
          changeType: "positive" as const,
          icon: FileText,
          color: "primary" as const,
        },
        {
          title: "Active Users",
          value: statsData.activeUsers.toString(),
          change: "+8.1%",
          changeType: "positive" as const,
          icon: Users,
          color: "accent" as const,
        },
        {
          title: "Queue Length",
          value: statsData.queueLength.toString(),
          change: "-15.2%",
          changeType: "positive" as const,
          icon: Clock,
          color: "warning" as const,
        },
        {
          title: "Success Rate",
          value: `${statsData.successRate}%`,
          change: "+0.3%",
          changeType: "positive" as const,
          icon: TrendingUp,
          color: "success" as const,
        },
      ]);

      setRecentJobs(recentJobsData);
      setSystemUsage(systemUsageData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleServiceClick = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>

          {/* Services Grid Skeleton */}
          <div className="space-y-6">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                  <div className="h-8 w-8 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileX className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={fetchDashboardData} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Welcome back <span className="wave">👋</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              Streamline your document processing with our enterprise-grade Document tools
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 border-gray-300 hover:bg-white transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <div className={`p-2 rounded-lg bg-${stat.color}-50`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">vs yesterday</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        {/* <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Ready to get started?</h2>
              <p className="text-blue-100 max-w-md">
                Upload your documents and transform them with our powerful processing tools
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="bg-white text-blue-600 hover:bg-blue-50 transition-colors"
                onClick={() => navigate("/tools")}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </Button>
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white/10 transition-colors"
                onClick={() => navigate("/analytics")}
              >
                <Clock className="mr-2 h-4 w-4" />
                View Queue
              </Button>
            </div>
          </div>
        </div> */}

        {/* Services Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Document Processing Services</h2>
              <p className="text-gray-600 mt-1">Choose from our suite of professional Document tools</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate("/tools")}
              className="border-gray-300 hover:bg-white"
            >
              View All Tools
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="group cursor-pointer"
                onClick={() => handleServiceClick(service.path)}
              >
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300 group-hover:scale-105 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-${service.color}-50 group-hover:bg-${service.color}-100 transition-colors`}>
                      <service.icon className={`h-6 w-6 text-${service.color}-600`} />
                    </div>
                    {service.isPopular && (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        <Zap className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-600 flex-grow">
                    {service.description}
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                      Get started →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Jobs */}
          <Card className="lg:col-span-2 border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900">Recent Processing Jobs</CardTitle>
              <CardDescription>Latest document processing activity across your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      job.status === "completed" ? "bg-green-50" :
                      job.status === "processing" ? "bg-blue-50" :
                      "bg-gray-50"
                    }`}>
                      <FileText className={`h-4 w-4 ${
                        job.status === "completed" ? "text-green-600" :
                        job.status === "processing" ? "text-blue-600" :
                        "text-gray-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{job.name}</p>
                      <p className="text-sm text-gray-500 truncate">{job.type} • {job.user}</p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`
                      ${job.status === "completed" ? "bg-green-100 text-green-800 hover:bg-green-100" :
                        job.status === "processing" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
                        "bg-gray-100 text-gray-800 hover:bg-gray-100"}
                    `}
                  >
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Usage */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900">System Usage</CardTitle>
              <CardDescription>Current platform utilization and performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Cpu className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                      <span className="text-sm text-gray-600">{systemUsage.cpuUsage}%</span>
                    </div>
                    <Progress value={systemUsage.cpuUsage} className="h-2 bg-gray-200" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MemoryStick className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Memory</span>
                      <span className="text-sm text-gray-600">{systemUsage.memoryUsage}%</span>
                    </div>
                    <Progress value={systemUsage.memoryUsage} className="h-2 bg-gray-200" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <HardDrive className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Storage</span>
                      <span className="text-sm text-gray-600">{systemUsage.storageUsage}%</span>
                    </div>
                    <Progress value={systemUsage.storageUsage} className="h-2 bg-gray-200" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Active Jobs</span>
                      <span className="text-sm text-gray-600">{systemUsage.activeJobs}/{systemUsage.maxJobs}</span>
                    </div>
                    <Progress 
                      value={(systemUsage.activeJobs / systemUsage.maxJobs) * 100} 
                      className="h-2 bg-gray-200" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        .wave {
          animation: wave 2.5s infinite;
          display: inline-block;
          transform-origin: 70% 70%;
        }

        @keyframes wave {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};