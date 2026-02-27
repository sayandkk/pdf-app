import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Calendar, User, FileText, Activity, Clock, Shield, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Zap, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi, analyticsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface AuditLog {
  id: string;
  type: 'user_activity' | 'document_activity';
  activityType: string | null;
  documentType: string | null;
  fileName: string | null;
  fileSize: number | null;
  processingTime: number | null;
  status: string | null;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
}

const ITEMS_PER_PAGE = 50;

export default function AuditLogs() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: auditLogs, isLoading, error } = useQuery({
    queryKey: [
      'audit-logs',
      currentPage,
      searchTerm,
      activityTypeFilter,
      documentTypeFilter,
      userFilter,
      startDate,
      endDate
    ],
    queryFn: async () => {
      const params: Record<string, string> = {
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      };

      if (activityTypeFilter && activityTypeFilter !== "all") params.activityType = activityTypeFilter;
      if (documentTypeFilter && documentTypeFilter !== "all") params.documentType = documentTypeFilter;
      if (userFilter) params.userId = userFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await analyticsApi.getAuditLogs(params);
      return response;
    },
    enabled: !authLoading && user?.role === 'admin',
  });

  const { data: countData } = useQuery({
    queryKey: [
      'audit-logs-count',
      searchTerm,
      activityTypeFilter,
      documentTypeFilter,
      userFilter,
      startDate,
      endDate
    ],
    queryFn: async () => {
      const params: Record<string, string> = {};

      if (activityTypeFilter && activityTypeFilter !== "all") params.activityType = activityTypeFilter;
      if (documentTypeFilter && documentTypeFilter !== "all") params.documentType = documentTypeFilter;
      if (userFilter) params.userId = userFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await analyticsApi.getAuditLogsCount(params);
      return response;
    },
    enabled: !authLoading && user?.role === 'admin',
  });

  const totalPages = Math.ceil((countData?.count || 0) / ITEMS_PER_PAGE);

  const getVisiblePages = (current: number, total: number) => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
      rangeWithDots.push('...', total);
    } else if (total > 1) {
      rangeWithDots.push(total);
    }

    return rangeWithDots.filter((item, index) => rangeWithDots.indexOf(item) === index);
  };

  const visiblePages = getVisiblePages(currentPage, totalPages);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getActivityBadgeVariant = (type: string) => {
    switch (type) {
      case 'login':
      case 'logout':
      case 'register':
        return 'default';
      case 'pdf_to_word':
      case 'word_to_pdf':
      case 'pdf_compression':
      case 'ocr':
      case 'merge_split':
      case 'image_to_pdf':
      case 'pdf_editor':
      case 'e_signature':
        return 'secondary';
      case 'password_change':
      case 'profile_update':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getActivityDisplayName = (type: string) => {
    const displayNames: Record<string, string> = {
      'login': 'Login',
      'logout': 'Logout',
      'register': 'Registration',
      'password_change': 'Password Change',
      'profile_update': 'Profile Update',
      'pdf_to_word': 'PDF to Word',
      'word_to_pdf': 'Word to PDF',
      'pdf_compression': 'PDF Compression',
      'ocr': 'OCR Processing',
      'merge_split': 'Merge & Split',
      'image_to_pdf': 'Image to PDF',
      'pdf_editor': 'PDF Editor',
      'e_signature': 'E-Signature',
    };
    return displayNames[type] || type;
  };

  const getStatusBadgeVariant = (status: string | null) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'processing':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="max-w-7xl mx-auto">
          <Card className="border-gray-200 shadow-sm w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You need admin privileges to view audit logs.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load audit logs",
      variant: "destructive",
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
             
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                  Audit Logs
                </h1>
                <p className="text-lg text-gray-600">
                  Monitor system activities and document processing across your organization
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 text-sm py-1">
            <Zap className="h-3 w-3 mr-1" />
            Real-time
          </Badge>
        </div>

        {/* Stats Card */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-2">{countData?.count || 0}</div>
                <div className="text-sm text-gray-600">Total Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {auditLogs?.filter((log: AuditLog) => log.status === 'completed' || log.status === 'success').length || 0}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 mb-2">
                  {auditLogs?.filter((log: AuditLog) => log.status === 'failed' || log.status === 'error').length || 0}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {auditLogs?.filter((log: AuditLog) => log.user).length || 0}
                </div>
                <div className="text-sm text-gray-600">User Activities</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              Filters & Search
            </CardTitle>
            <CardDescription className="text-gray-600">
              Filter audit logs by activity type, date range, and other criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <Label htmlFor="search" className="text-gray-900 font-medium">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by user email or filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl border-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="activity-type" className="text-gray-900 font-medium">Activity Type</Label>
                <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                  <SelectTrigger className="rounded-xl border-gray-300">
                    <SelectValue placeholder="All activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All activities</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                    <SelectItem value="register">Register</SelectItem>
                    <SelectItem value="password_change">Password Change</SelectItem>
                    <SelectItem value="profile_update">Profile Update</SelectItem>
                    <SelectItem value="pdf_to_word">PDF to Word</SelectItem>
                    <SelectItem value="word_to_pdf">Word to PDF</SelectItem>
                    <SelectItem value="pdf_compression">PDF Compression</SelectItem>
                    <SelectItem value="ocr">OCR Processing</SelectItem>
                    <SelectItem value="merge_split">Merge & Split</SelectItem>
                    <SelectItem value="image_to_pdf">Image to PDF</SelectItem>
                    <SelectItem value="pdf_editor">PDF Editor</SelectItem>
                    <SelectItem value="e_signature">E-Signature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="document-type" className="text-gray-900 font-medium">Document Type</Label>
                <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                  <SelectTrigger className="rounded-xl border-gray-300">
                    <SelectValue placeholder="All document types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All document types</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="word">Word</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="signature">Signature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="start-date" className="text-gray-900 font-medium">Date Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-xl border-gray-300"
                    />
                  </div>
                  <div>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-xl border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setActivityTypeFilter("all");
                  setDocumentTypeFilter("all");
                  setUserFilter("");
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="border-gray-300 hover:bg-white"
              >
                Clear Filters
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              Activity Log
            </CardTitle>
            <CardDescription className="text-gray-600">
              {countData?.count || 0} total activities • Real-time monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading audit logs...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-gray-200">
                        <TableHead className="text-gray-900 font-semibold">Timestamp</TableHead>
                        <TableHead className="text-gray-900 font-semibold">User</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Activity</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Document</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs && auditLogs.length > 0 ? (
                        auditLogs.map((log: AuditLog) => (
                          <TableRow key={log.id} className="hover:bg-gray-50 border-b border-gray-200 last:border-0">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <Clock className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">
                                    {formatDate(log.createdAt)}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.user ? (
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {log.user.firstName} {log.user.lastName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {log.user.email}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-gray-100 rounded-lg">
                                    <Shield className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <span className="text-gray-600">System</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                {getActivityDisplayName(log.activityType || log.documentType || 'Unknown')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.fileName ? (
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-green-100 rounded-lg">
                                    <FileText className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{log.fileName}</div>
                                    {log.fileSize && (
                                      <div className="text-sm text-gray-600">
                                        {formatFileSize(log.fileSize)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.status && (
                                <Badge className={getStatusBadgeVariant(log.status)}>
                                  {log.status}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600 space-y-1">
                                {log.processingTime && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {log.processingTime}ms
                                  </div>
                                )}
                                {log.ipAddress && (
                                  <div className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    {log.ipAddress}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="text-gray-500">
                              <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                              <p className="text-lg font-medium mb-2">No audit logs found</p>
                              <p className="text-sm">Try adjusting your filters or search criteria</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, countData?.count || 0)} of {countData?.count || 0} entries
                    </div>
                    <div className="flex items-center gap-1">
                      {/* First Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0 rounded-lg border-gray-300 hover:bg-gray-100"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>

                      {/* Previous Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0 rounded-lg border-gray-300 hover:bg-gray-100"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {/* Page Numbers */}
                      {visiblePages.map((page, index) => (
                        <Button
                          key={index}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => typeof page === 'number' && setCurrentPage(page)}
                          disabled={page === '...'}
                          className={`h-8 min-w-8 px-2 rounded-lg ${
                            page === currentPage
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : page === '...'
                              ? 'cursor-default hover:bg-transparent border-gray-300'
                              : 'border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </Button>
                      ))}

                      {/* Next Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0 rounded-lg border-gray-300 hover:bg-gray-100"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                      {/* Last Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0 rounded-lg border-gray-300 hover:bg-gray-100"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}