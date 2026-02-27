import { TrendingUp, FileText, Users, Clock, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const monthlyData = [
  { month: 'Jan', documents: 1240, users: 45 },
  { month: 'Feb', documents: 1890, users: 52 },
  { month: 'Mar', documents: 2340, users: 61 },
  { month: 'Apr', documents: 1980, users: 58 },
  { month: 'May', documents: 2780, users: 68 },
  { month: 'Jun', documents: 3240, users: 75 },
];

const toolUsageData = [
  { name: 'PDF to Word', value: 35, count: 1247 },
  { name: 'Word to PDF', value: 25, count: 892 },
  { name: 'PDF Compression', value: 20, count: 714 },
  { name: 'OCR Scanner', value: 12, count: 428 },
  { name: 'Merge & Split', value: 8, count: 285 },
];

const COLORS = ['hsl(214, 84%, 56%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(264, 71%, 45%)'];
export const Analytics = () => {
  const { toast } = useToast();

  // Fetch key metrics
  const { data: keyMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['analytics', 'key-metrics'],
    queryFn: analyticsApi.getKeyMetrics,
  });

  // Fetch monthly trends
  const { data: monthlyTrends, isLoading: trendsLoading, error: trendsError } = useQuery({
    queryKey: ['analytics', 'monthly-trends'],
    queryFn: () => analyticsApi.getMonthlyTrends(6),
  });

  // Fetch tool usage
  const { data: toolUsage, isLoading: toolUsageLoading, error: toolUsageError } = useQuery({
    queryKey: ['analytics', 'tool-usage'],
    queryFn: analyticsApi.getToolUsage,
  });

  // Fetch system performance
  const { data: systemPerformance, isLoading: performanceLoading, error: performanceError } = useQuery({
    queryKey: ['analytics', 'system-performance'],
    queryFn: () => analyticsApi.getSystemPerformance(24),
  });

  // Fetch department usage
  const { data: departmentUsage, isLoading: departmentLoading, error: departmentError } = useQuery({
    queryKey: ['analytics', 'department-usage'],
    queryFn: analyticsApi.getDepartmentUsage,
  });

  // Handle errors with useEffect
  useEffect(() => {
    if (metricsError) {
      toast({
        title: "Error",
        description: "Failed to load key metrics",
        variant: "destructive",
      });
    }
  }, [metricsError, toast]);

  useEffect(() => {
    if (trendsError) {
      toast({
        title: "Error",
        description: "Failed to load monthly trends",
        variant: "destructive",
      });
    }
  }, [trendsError, toast]);

  useEffect(() => {
    if (toolUsageError) {
      toast({
        title: "Error",
        description: "Failed to load tool usage data",
        variant: "destructive",
      });
    }
  }, [toolUsageError, toast]);

  useEffect(() => {
    if (performanceError) {
      toast({
        title: "Error",
        description: "Failed to load system performance data",
        variant: "destructive",
      });
    }
  }, [performanceError, toast]);

  useEffect(() => {
    if (departmentError) {
      toast({
        title: "Error",
        description: "Failed to load department usage data",
        variant: "destructive",
      });
    }
  }, [departmentError, toast]);
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Reporting</h1>
          <p className="text-muted-foreground mt-1">
            Monitor platform performance and usage across your organization
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">
                  {metricsLoading ? '...' : (keyMetrics?.totalDocuments || 0).toLocaleString()}
                </p>
                <p className="text-xs text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +23.1% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">
                  {metricsLoading ? '...' : (keyMetrics?.activeUsers || 0).toLocaleString()}
                </p>
                <p className="text-xs text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +12.3% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Processing Time</p>
                <p className="text-2xl font-bold text-foreground">
                  {metricsLoading ? '...' : `${(keyMetrics?.avgProcessingTime || 0).toFixed(1)}s`}
                </p>
                <p className="text-xs text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  -0.5s from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {metricsLoading ? '...' : `${keyMetrics?.successRate || 0}%`}
                </p>
                <p className="text-xs text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +0.3% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-success/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Processing Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Document Processing Trends</CardTitle>
            <CardDescription>Monthly document processing volume and user growth</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Loading trends data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="documents" fill="hsl(214, 84%, 56%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tool Usage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Tool Usage Distribution</CardTitle>
            <CardDescription>Most popular document processing tools</CardDescription>
          </CardHeader>
          <CardContent>
            {toolUsageLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Loading tool usage data...</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={toolUsage || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      dataKey="value"
                    >
                      {(toolUsage || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {(toolUsage || []).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Performance */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance (Last 24 Hours)</CardTitle>
          <CardDescription>Real-time monitoring of system resources and job queue</CardDescription>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Loading performance data...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={systemPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="hsl(214, 84%, 56%)" 
                  strokeWidth={2}
                  name="CPU Usage (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="hsl(142, 71%, 45%)" 
                  strokeWidth={2}
                  name="Memory Usage (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="jobs" 
                  stroke="hsl(38, 92%, 50%)" 
                  strokeWidth={2}
                  name="Active Jobs"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Department Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Department Usage Overview</CardTitle>
          <CardDescription>Document processing activity by department</CardDescription>
        </CardHeader>
        <CardContent>
          {departmentLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">Loading department data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(departmentUsage || []).map((dept) => (
                <div key={dept.dept} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-20 text-sm font-medium">{dept.dept}</div>
                    <div className="flex-1">
                      <Progress value={dept.usage} className="h-2" />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium">{dept.docs}</p>
                    <p className="text-xs text-muted-foreground">documents</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};