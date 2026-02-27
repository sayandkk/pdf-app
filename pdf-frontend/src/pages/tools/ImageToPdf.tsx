import { useState, useEffect } from "react";
import { Upload, Download, Image, Settings, Clock, CheckCircle, AlertCircle, Grid, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { API_BASE_URL } from "@/config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    completed: { color: "bg-green-100 text-green-800 hover:bg-green-100", icon: CheckCircle },
    processing: { color: "bg-blue-100 text-blue-800 hover:bg-blue-100", icon: Clock },
    failed: { color: "bg-red-100 text-red-800 hover:bg-red-100", icon: AlertCircle },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <Badge className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export const ImageToPdf = () => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  // Settings states
  const [jpegQuality, setJpegQuality] = useState([85]);
  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("auto");
  const [imagesPerPage, setImagesPerPage] = useState("1");
  const [margins, setMargins] = useState("normal");
  const [fitToPage, setFitToPage] = useState(true);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [centerImages, setCenterImages] = useState(true);
  const [optimizeFileSize, setOptimizeFileSize] = useState(false);

  // History state
  const [conversionHistory, setConversionHistory] = useState<any[]>([]);

  // Save settings to backend
  const saveSettings = async (customSettings?: any) => {
    const settings = customSettings || {
      jpegQuality: jpegQuality[0],
      pageSize,
      orientation,
      imagesPerPage,
      margins,
      fitToPage,
      maintainAspect,
      centerImages,
      optimizeFileSize,
    };
    try {
      await fetch(`${API_BASE_URL}/image-to-pdf/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch {
      // Optionally handle error
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  // Drag and drop reorder
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(files);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setFiles(reordered);
  };

  // Fetch conversion history from backend
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/image-to-pdf/history`);
      if (res.ok) {
        const data = await res.json();
        setConversionHistory(data);
      }
    } catch (err) {
      // ignore
    }
  };

  // Fetch settings from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/image-to-pdf/settings`);
        if (res.ok) {
          const data = await res.json();
          setJpegQuality([parseInt(data.jpegQuality)]);
          setPageSize(data.pageSize);
          setOrientation(data.orientation);
          setImagesPerPage(data.imagesPerPage);
          setMargins(data.margins);
          setFitToPage(data.fitToPage);
          setMaintainAspect(data.maintainAspect);
          setCenterImages(data.centerImages);
          setOptimizeFileSize(data.optimizeFileSize);
        }
      } catch { }
    };
    fetchSettings();
    fetchHistory();
  }, []);

  // Send all settings and all images to backend
  const startConversion = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    setConversionProgress(0);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file, file.name);
    });
    formData.append('jpegQuality', jpegQuality[0].toString());
    formData.append('pageSize', pageSize);
    formData.append('orientation', orientation);
    formData.append('imagesPerPage', imagesPerPage);
    formData.append('margins', margins);
    formData.append('fitToPage', fitToPage ? "true" : "false");
    formData.append('maintainAspect', maintainAspect ? "true" : "false");
    formData.append('centerImages', centerImages ? "true" : "false");
    formData.append('optimizeFileSize', optimizeFileSize ? "true" : "false");

    try {
      const response = await fetch(`${API_BASE_URL}/image-to-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setConversionProgress(100);
        fetchHistory();
      } else {
        alert('Conversion failed');
      }
    } catch (err) {
      alert('Error connecting to backend');
    } finally {
      setIsConverting(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- Persist settings on every change ---
  const handleJpegQuality = (val: number[]) => {
    setJpegQuality(val);
    saveSettings({
      jpegQuality: val[0],
      pageSize,
      orientation,
      imagesPerPage,
      margins,
      fitToPage,
      maintainAspect,
      centerImages,
      optimizeFileSize,
    });
  };
  const handlePageSize = (val: string) => {
    setPageSize(val);
    saveSettings({
      jpegQuality: jpegQuality[0],
      pageSize: val,
      orientation,
      imagesPerPage,
      margins,
      fitToPage,
      maintainAspect,
      centerImages,
      optimizeFileSize,
    });
  };
  const handleOrientation = (val: string) => {
    setOrientation(val);
    saveSettings({
      jpegQuality: jpegQuality[0],
      pageSize,
      orientation: val,
      imagesPerPage,
      margins,
      fitToPage,
      maintainAspect,
      centerImages,
      optimizeFileSize,
    });
  };
  const handleImagesPerPage = (val: string) => {
    setImagesPerPage(val);
    saveSettings({
      jpegQuality: jpegQuality[0],
      pageSize,
      orientation,
      imagesPerPage: val,
      margins,
      fitToPage,
      maintainAspect,
      centerImages,
      optimizeFileSize,
    });
  };
  const handleMargins = (val: string) => {
    setMargins(val);
    saveSettings({
      jpegQuality: jpegQuality[0],
      pageSize,
      orientation,
      imagesPerPage,
      margins: val,
      fitToPage,
      maintainAspect,
      centerImages,
      optimizeFileSize,
    });
  };
  const handleFitToPage = (val: boolean) => {
    setFitToPage(val);
    saveSettings({
      jpegQuality: jpegQuality[0],
      pageSize,
      orientation,
      imagesPerPage,
      margins,
      fitToPage: val,
      maintainAspect,
      centerImages,
      optimizeFileSize,
    });
  };
  const handleMaintainAspect = (val: boolean) => {
    setMaintainAspect(val);
    saveSettings({
      jpegQuality: jpegQuality[0],
      pageSize,
      orientation,
      imagesPerPage,
      margins,
      fitToPage,
      maintainAspect: val,
      centerImages,
      optimizeFileSize,
    });
  };
  const handleCenterImages = (val: boolean) => {
    setCenterImages(val);
    saveSettings({
      jpegQuality: jpegQuality[0],
      pageSize,
      orientation,
      imagesPerPage,
      margins,
      fitToPage,
      maintainAspect,
      centerImages: val,
      optimizeFileSize,
    });
  };
  const handleOptimizeFileSize = (val: boolean) => {
    setOptimizeFileSize(val);
    saveSettings({
      jpegQuality: jpegQuality[0],
      pageSize,
      orientation,
      imagesPerPage,
      margins,
      fitToPage,
      maintainAspect,
      centerImages,
      optimizeFileSize: val,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                  Image to PDF Converter
                </h1>
                <p className="text-lg text-gray-600">
                  Convert images to PDF with batch processing, custom layouts, and drag & drop reordering
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-sm py-1">
            <Zap className="h-3 w-3 mr-1" />
            Batch Support
          </Badge>
        </div>

        <Tabs defaultValue="convert" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 lg:grid-cols-3 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
            <TabsTrigger 
              value="convert" 
              className="rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border data-[state=active]:border-blue-200"
            >
              Convert Images
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border data-[state=active]:border-blue-200"
            >
              Layout & Quality
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border data-[state=active]:border-blue-200"
            >
              Conversion History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-6">
            {/* Upload Area */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  Upload Images
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Support for JPG, PNG, TIFF, BMP, GIF formats • Drag to reorder • Batch processing • Up to 50 images per batch
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
                    dragActive
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-300 hover:border-purple-300 hover:bg-purple-50/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your images here
                  </p>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    JPG, PNG, TIFF, BMP, GIF • Up to 50 images per batch • 20MB max per file • Drag to reorder
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild className="bg-purple-600 hover:bg-purple-700">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Browse Images
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.tiff,.tif,.bmp,.gif"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </Button>
                    <span className="text-gray-500">or</span>
                    <Button variant="outline" className="border-gray-300 hover:bg-white">
                      Import from Gallery
                    </Button>
                  </div>
                </div>

                {/* Image Grid */}
                {files.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 text-lg">Selected Images ({files.length})</h4>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="border-gray-300 hover:bg-white">
                          <Grid className="h-4 w-4 mr-2" />
                          Arrange Layout
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setFiles([])}
                          className="border-gray-300 hover:bg-white text-gray-700"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="images" direction="horizontal">
                        {(provided) => (
                          <div
                            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {files.map((file, index) => (
                              <Draggable key={file.name + index} draggableId={file.name + index} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`relative group border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-all duration-200 aspect-square ${
                                      snapshot.isDragging ? "ring-2 ring-purple-500 shadow-lg" : ""
                                    }`}
                                  >
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                      <Image className="h-8 w-8 text-purple-600" />
                                    </div>
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFile(index)}
                                        className="text-white hover:text-red-400 hover:bg-white/20"
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 truncate">
                                      {file.name}
                                    </div>
                                    <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-lg">
                                      {index + 1}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    <p className="text-sm text-gray-600">
                      Total size: {(files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                )}

                {/* Conversion Controls */}
                {files.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    {isConverting ? (
                      <div className="space-y-4 bg-blue-50 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">Creating PDF from images...</span>
                          <span className="text-sm text-gray-600">{conversionProgress}%</span>
                        </div>
                        <Progress value={conversionProgress} className="h-2 bg-gray-200" />
                        <p className="text-sm text-gray-600 text-center">
                          Processing {files.length} image(s). Optimizing layout and compression.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Button
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-sm"
                          onClick={startConversion}
                          size="lg"
                        >
                          <Image className="mr-2 h-5 w-5" />
                          Create PDF ({files.length} images)
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setFiles([])}
                          className="border-gray-300 hover:bg-white"
                        >
                          Clear Selection
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Settings className="h-5 w-5 text-blue-600" />
                  </div>
                  PDF Layout & Quality Settings
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Customize how images are arranged, optimized, and displayed in the PDF output
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="page-size" className="text-gray-900 font-medium">Page Size</Label>
                      <Select value={pageSize} onValueChange={handlePageSize}>
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select page size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                          <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                          <SelectItem value="legal">Legal (8.5 × 14 in)</SelectItem>
                          <SelectItem value="a3">A3 (297 × 420 mm)</SelectItem>
                          <SelectItem value="custom">Custom Size</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="orientation" className="text-gray-900 font-medium">Page Orientation</Label>
                      <Select value={orientation} onValueChange={handleOrientation}>
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select orientation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (Based on Image)</SelectItem>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="layout" className="text-gray-900 font-medium">Images Per Page</Label>
                      <Select value={imagesPerPage} onValueChange={handleImagesPerPage}>
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select layout" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Image per Page</SelectItem>
                          <SelectItem value="2">2 Images per Page</SelectItem>
                          <SelectItem value="4">4 Images per Page (Grid)</SelectItem>
                          <SelectItem value="6">6 Images per Page (Grid)</SelectItem>
                          <SelectItem value="auto">Auto Fit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="margins" className="text-gray-900 font-medium">Page Margins</Label>
                      <Select value={margins} onValueChange={handleMargins}>
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select margins" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Margins</SelectItem>
                          <SelectItem value="small">Small (5mm)</SelectItem>
                          <SelectItem value="normal">Normal (10mm)</SelectItem>
                          <SelectItem value="large">Large (20mm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4 bg-gray-50 rounded-2xl p-4">
                      <Label className="text-gray-900 font-medium">JPEG Quality: {jpegQuality[0]}%</Label>
                      <Slider
                        value={jpegQuality}
                        onValueChange={handleJpegQuality}
                        max={100}
                        min={10}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-600">
                        Higher quality = larger file size, Lower quality = smaller file size
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                        <div className="space-y-1">
                          <Label className="text-gray-900 font-medium">Fit Images to Page</Label>
                          <p className="text-sm text-gray-600">
                            Scale images to fit page dimensions
                          </p>
                        </div>
                        <Switch checked={fitToPage} onCheckedChange={handleFitToPage} />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                        <div className="space-y-1">
                          <Label className="text-gray-900 font-medium">Maintain Aspect Ratio</Label>
                          <p className="text-sm text-gray-600">
                            Prevent image distortion during scaling
                          </p>
                        </div>
                        <Switch checked={maintainAspect} onCheckedChange={handleMaintainAspect} />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                        <div className="space-y-1">
                          <Label className="text-gray-900 font-medium">Center Images</Label>
                          <p className="text-sm text-gray-600">
                            Center images on page for better layout
                          </p>
                        </div>
                        <Switch checked={centerImages} onCheckedChange={handleCenterImages} />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                        <div className="space-y-1">
                          <Label className="text-gray-900 font-medium">Optimize File Size</Label>
                          <p className="text-sm text-gray-600">
                            Compress images for smaller PDF file size
                          </p>
                        </div>
                        <Switch checked={optimizeFileSize} onCheckedChange={handleOptimizeFileSize} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  Recent Image Conversions
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Download your created PDF files from images. History is kept for 30 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-gray-200">
                        <TableHead className="text-gray-900 font-semibold">Batch Name</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Images</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Original Size</TableHead>
                        <TableHead className="text-gray-900 font-semibold">PDF Size</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Created</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversionHistory.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50 border-b border-gray-200 last:border-0">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-50 rounded-lg">
                                <Image className="h-4 w-4 text-purple-600" />
                              </div>
                              <span className="font-medium text-gray-900">{item.filename}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                              {item.imageCount} images
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {item.totalSize}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {item.convertedSize}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.status} />
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {item.convertedAt ? new Date(item.convertedAt).toLocaleString() : ""}
                          </TableCell>
                          <TableCell>
                            {item.status === "completed" ? (
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Download className="h-4 w-4 mr-1" />
                                Download PDF
                              </Button>
                            ) : item.status === "processing" ? (
                              <span className="text-sm text-gray-600">Creating PDF...</span>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                Retry
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};export default ImageToPdf;