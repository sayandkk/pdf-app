import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Upload, Download, FileIcon, Edit3, Type, Highlighter,
  Square, Circle, ArrowRight, MessageSquare, Stamp, Eye, EyeOff,
  Loader2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Document, Page, pdfjs } from 'react-pdf';
import { pdfEditorApi } from "@/lib/api";

// Configure PDF.js worker - using local worker for better compatibility
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

console.log('PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc);

// Verify worker is accessible
fetch('/pdf.worker.min.mjs')
  .then(response => {
    if (response.ok) {
      console.log('PDF.js worker file is accessible');
    } else {
      console.error('PDF.js worker file is not accessible:', response.status);
    }
  })
  .catch(error => {
    console.error('Error checking PDF.js worker:', error);
  });

// Add required CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface DocumentInfo {
  id: string;
  name: string;
  pages: number;
  size: number;
  annotations: number;
  createdAt: string;
  lastModified: string;
}

interface Annotation {
  id: string;
  type: 'text' | 'highlight' | 'rectangle' | 'circle' | 'arrow' | 'comment';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  opacity?: number;
  author?: string;
  timestamp: string;
}

type AnnotationToolId = "text" | "highlight" | "rectangle" | "circle" | "arrow" | "comment";

const annotationTools: Array<{
  id: AnnotationToolId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}> = [
  { id: "text", icon: Type, label: "Text", color: "primary" },
  { id: "highlight", icon: Highlighter, label: "Highlight", color: "warning" },
  { id: "rectangle", icon: Square, label: "Rectangle", color: "accent" },
  { id: "circle", icon: Circle, label: "Circle", color: "success" },
  { id: "arrow", icon: ArrowRight, label: "Arrow", color: "primary" },
  { id: "comment", icon: MessageSquare, label: "Comment", color: "accent" },
];

export const PdfEditor = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<"text" | "highlight" | "rectangle" | "circle" | "arrow" | "comment">("text");
  const [annotationText, setAnnotationText] = useState("");
  const [highlightColor, setHighlightColor] = useState("#ffeb3b");
  const [opacity, setOpacity] = useState([70]);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Document state
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Loading states
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);

  // Editing state
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [editText, setEditText] = useState("");

  // PDF state
  const [pdfDocument, setPdfDocument] = useState<File | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);

  // API base URL - using the centralized API
  // const API_BASE = 'http://localhost:3000/pdf-editor';

  // Upload PDF file
  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast.error("Please select a PDF file");
      return;
    }

    setIsUploading(true);
    setPdfLoadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await pdfEditorApi.uploadPdf(formData);

      if (result.success) {
        setDocumentId(result.data.documentId);
        setSelectedFile(file);

        // Load PDF for viewing - use file directly for react-pdf
        console.log('Setting PDF file for viewing...');
        try {
          // Use the file directly - react-pdf can handle File objects
          setPdfDocument(file);
          setPdfLoadError(null);
          console.log('PDF file set successfully');
        } catch (error) {
          console.error('Error setting PDF file:', error);
          setPdfLoadError('Failed to process PDF file. Please try a different PDF.');
          toast.error('Failed to process PDF file');
        }

        await fetchDocumentInfo(result.data.documentId);
        await fetchAnnotations(result.data.documentId);
        toast.success("PDF uploaded successfully!");
      } else {
        toast.error(result.message || "Failed to upload PDF");
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload PDF");
      setPdfLoadError("Failed to load PDF for viewing");
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch document information
  const fetchDocumentInfo = async (docId: string) => {
    try {
      const result = await pdfEditorApi.getDocumentInfo(docId);

      if (result.success) {
        setDocumentInfo(result.data);
      }
    } catch (error) {
      console.error('Error fetching document info:', error);
    }
  };

  // Fetch annotations
  const fetchAnnotations = async (docId: string) => {
    setIsLoadingAnnotations(true);
    try {
      const result = await pdfEditorApi.getAnnotations(docId);

      if (result.success) {
        setAnnotations(result.data);
      }
    } catch (error) {
      console.error('Error fetching annotations:', error);
    } finally {
      setIsLoadingAnnotations(false);
    }
  };

  // Add annotation (button click - places at center or random position)
  const handleAddAnnotation = async () => {
    if (!documentId) {
      toast.error("Please upload a PDF first");
      return;
    }

    if (!annotationText.trim() && activeTool === 'text') {
      toast.error("Please enter annotation text");
      return;
    }

    // Place at center of current view or random position
    const centerX = 300; // Center of typical PDF width
    const centerY = 400; // Center of typical PDF height

    await handleAddAnnotationAtPosition(centerX, centerY);
  };

  // Save document
  const handleSave = async () => {
    if (!documentId) return;

    setIsSaving(true);
    try {
      const result = await pdfEditorApi.saveDocument(documentId);

      if (result.success) {
        toast.success("Document saved successfully!");
        await fetchDocumentInfo(documentId);
      } else {
        toast.error(result.message || "Failed to save document");
      }
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  // Export document
  const handleExport = async () => {
    if (!documentId) return;

    setIsExporting(true);
    try {
      const blob = await pdfEditorApi.exportDocument(documentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentInfo?.name || 'edited-document.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Document exported successfully!");
    } catch (error) {
      console.error('Error exporting document:', error);
      toast.error("Failed to export document");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get recent annotations (last 4)
  const recentAnnotations = annotations
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);

  // Handle PDF document load success
  const onDocumentLoadSuccess = (pdf: any) => {
    console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
    console.log('PDF object:', pdf);
    setPdfLoadError(null);
    // Page dimensions will be set when the Page component loads
  };

  // Handle PDF document load error
  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    let errorMessage = `Failed to load PDF document: ${error.message}`;

    // Provide more specific error messages
    if (error.message.includes('InvalidPDFException')) {
      errorMessage = 'The uploaded file is not a valid PDF. Please select a valid PDF file.';
    } else if (error.message.includes('MissingPDFException')) {
      errorMessage = 'The PDF file appears to be corrupted or incomplete. Please try a different PDF.';
    } else if (error.message.includes('UnexpectedResponseException')) {
      errorMessage = 'Unable to load PDF. Please check your internet connection and try again.';
    }

    setPdfLoadError(errorMessage);
    toast.error('Failed to load PDF document');
  };

  // Handle click on PDF to place annotation
  const handlePdfClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!documentId || !pdfContainerRef.current || !pageDimensions) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const scale = pdfScale;

    // Get click position relative to the PDF container
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Find the Page component within the container to get its actual position
    const pageElement = pdfContainerRef.current.querySelector('.react-pdf__Page');
    if (!pageElement) return;

    const pageRect = pageElement.getBoundingClientRect();
    const pageClickX = event.clientX - pageRect.left;
    const pageClickY = event.clientY - pageRect.top;

    // Convert to PDF coordinates (PDF-lib uses bottom-left origin)
    const pdfX = (pageClickX / scale) / (pageRect.width / pageDimensions.width);
    const pdfY = pageDimensions.height - ((pageClickY / scale) / (pageRect.height / pageDimensions.height));

    console.log('Click coordinates:', { clickX, clickY, pdfX, pdfY, pageDimensions, scale });

    handleAddAnnotationAtPosition(pdfX, pdfY);
  };

  // Handle annotation edit
  const handleEditAnnotation = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setEditText(annotation.text || "");
  };

  // Handle annotation update
  const handleUpdateAnnotation = async () => {
    if (!editingAnnotation || !documentId) return;

    try {
      const result = await pdfEditorApi.updateAnnotation(documentId, editingAnnotation.id, {
        text: editText
      });

      if (result.success) {
        setAnnotations(prev => prev.map(a => a.id === editingAnnotation.id ? result.data : a));
        setEditingAnnotation(null);
        setEditText("");
        toast.success("Annotation updated!");
      } else {
        toast.error(result.message || "Failed to update annotation");
      }
    } catch (error) {
      console.error('Error updating annotation:', error);
      toast.error("Failed to update annotation");
    }
  };

  // Handle annotation delete
  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!documentId) return;

    try {
      const result = await pdfEditorApi.deleteAnnotation(documentId, annotationId);

      if (result.success) {
        setAnnotations(prev => prev.filter(a => a.id !== annotationId));
        await fetchDocumentInfo(documentId);
        toast.success("Annotation deleted!");
      } else {
        toast.error(result.message || "Failed to delete annotation");
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error("Failed to delete annotation");
    }
  };

  // Add annotation at specific position
  const handleAddAnnotationAtPosition = async (x: number, y: number) => {
    if (!documentId) {
      toast.error("Please upload a PDF first");
      return;
    }

    if (!annotationText.trim() && activeTool === 'text') {
      toast.error("Please enter annotation text");
      return;
    }

    // Set default dimensions based on annotation type
    let width: number | undefined;
    let height: number | undefined;

    switch (activeTool) {
      case 'highlight':
        width = 100; // Default highlight width
        height = 20; // Default highlight height
        break;
      case 'rectangle':
        width = 80;
        height = 40;
        break;
      case 'circle':
        width = 30; // Diameter for circle
        height = 30;
        break;
      case 'arrow':
        width = 50; // Arrow length
        height = 10;
        break;
      // text and comment don't need width/height
    }

    try {
      const annotationData = {
        type: activeTool,
        page: currentPage,
        x,
        y,
        width,
        height,
        text: annotationText,
        color: highlightColor,
        opacity: opacity[0] / 100,
        author: "Current User"
      };

      const result = await pdfEditorApi.addAnnotation(documentId, annotationData);

      if (result.success) {
        setAnnotations(prev => [...prev, result.data]);
        setAnnotationText("");
        await fetchDocumentInfo(documentId);
        toast.success("Annotation added!");
      } else {
        toast.error(result.message || "Failed to add annotation");
      }
    } catch (error) {
      console.error('Error adding annotation:', error);
      toast.error("Failed to add annotation");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Edit3 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">PDF Editor</h1>
        <Badge variant="secondary">Advanced</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Toolbar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Annotation Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {annotationTools.map((tool) => (
                <Button
                  key={tool.id}
                  variant={activeTool === tool.id ? "default" : "outline"}
                  size="sm"
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={() => setActiveTool(tool.id)}
                >
                  <tool.icon className="h-4 w-4" />
                  <span className="text-xs">{tool.label}</span>
                </Button>
              ))}
            </div>

            {/* Tool Settings */}
            <div className="space-y-3 pt-3 border-t">
              <div className="space-y-2">
                <Label htmlFor="annotation-text" className="text-sm">Annotation Text</Label>
                <Textarea
                  id="annotation-text"
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  placeholder="Enter annotation text..."
                  className="text-sm"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="highlight-color" className="text-sm">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="highlight-color"
                    type="color"
                    value={highlightColor}
                    onChange={(e) => setHighlightColor(e.target.value)}
                    className="w-12 h-8 p-1"
                  />
                  <Input
                    value={highlightColor}
                    onChange={(e) => setHighlightColor(e.target.value)}
                    className="flex-1 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Opacity</Label>
                  <span className="text-sm text-muted-foreground">{opacity[0]}%</span>
                </div>
                <Slider
                  value={opacity}
                  onValueChange={setOpacity}
                  max={100}
                  min={10}
                  step={10}
                  className="w-full"
                />
              </div>

              <Button
                onClick={handleAddAnnotation}
                className="w-full"
                disabled={!documentId}
                size="sm"
              >
                Add {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} (or click PDF)
              </Button>

              {/* Advanced Tools */}
              <div className="space-y-2 pt-3 border-t">
                <Label className="text-sm font-medium">Advanced Tools</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Mock redaction - get coordinates from current page center
                      if (documentId) {
                        const pageWidth = pageDimensions?.width || 600;
                        const pageHeight = pageDimensions?.height || 800;
                        const centerX = pageWidth / 2 - 50; // Center horizontally
                        const centerY = pageHeight / 2 - 25; // Center vertically

                        pdfEditorApi.redactContent(documentId, {
                          page: currentPage,
                          x: centerX,
                          y: centerY,
                          width: 100,
                          height: 50
                        }).then(() => {
                          toast.success("Content redacted!");
                          fetchDocumentInfo(documentId);
                        });
                      }
                    }}
                    disabled={!documentId}
                  >
                    <Stamp className="h-3 w-3 mr-1" />
                    Redact
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (documentId) {
                        const pageWidth = pageDimensions?.width || 600;
                        const pageHeight = pageDimensions?.height || 800;
                        const centerX = pageWidth / 2 - 100; // Center the watermark
                        const centerY = pageHeight / 2;

                        pdfEditorApi.addWatermark(documentId, {
                          type: 'text',
                          text: 'CONFIDENTIAL',
                          x: centerX,
                          y: centerY,
                          opacity: 0.5,
                          fontSize: 24
                        }).then(() => {
                          toast.success("Watermark added!");
                          fetchDocumentInfo(documentId);
                        });
                      }
                    }}
                    disabled={!documentId}
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Watermark
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Editor Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-red-500" />
                {documentInfo?.name || "No document loaded"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  disabled={!documentId}
                >
                  {showAnnotations ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showAnnotations ? "Hide" : "Show"} Annotations
                </Button>
                <Badge variant="secondary">
                  {isLoadingAnnotations ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    `${annotations.length} annotations`
                  )}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!documentId ? (
              /* Upload Area */
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg aspect-[3/4] flex items-center justify-center bg-muted/20">
                <div className="text-center space-y-4">
                  <Upload className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-lg font-medium">Upload PDF Document</p>
                    <p className="text-sm text-muted-foreground">
                      Select a PDF file to start editing
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose PDF File
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* PDF Viewer */
              <div 
                ref={pdfContainerRef}
                className="border-2 border-muted-foreground/25 rounded-lg bg-white relative overflow-auto"
                style={{ maxHeight: '600px' }}
                onClick={handlePdfClick}
              >
                {pdfLoadError ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-4">
                      <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Failed to load PDF</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md">
                          {pdfLoadError}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Reset error and try to reload
                            setPdfLoadError(null);
                            if (selectedFile) {
                              console.log('Retrying PDF load with file:', selectedFile.name);
                              setPdfDocument(selectedFile);
                            }
                          }}
                        >
                          Try Again
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Choose Different File
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : pdfDocument ? (
                  <Document
                    key={documentId} // Force re-render when document changes
                    file={pdfDocument}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading PDF...</span>
                      </div>
                    }
                    error={
                      <div className="flex items-center justify-center h-96">
                        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                        <p className="text-sm text-destructive mt-2">Failed to load PDF</p>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={currentPage}
                      scale={pdfScale}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      onLoadSuccess={(page) => {
                        console.log('Page loaded:', page);
                        // Get page dimensions from the page object
                        const viewport = page.getViewport({ scale: 1 });
                        setPageDimensions({
                          width: viewport.width,
                          height: viewport.height
                        });
                        console.log(`Page dimensions from Page: ${viewport.width} x ${viewport.height}`);
                      }}
                      loading={
                        <div className="flex items-center justify-center h-96">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      }
                    />
                  </Document>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-2">
                      <FileIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Loading PDF...</p>
                    </div>
                  </div>
                )}

                {/* Annotation overlay */}
                {showAnnotations && annotations
                  .filter(a => a.page === currentPage)
                  .map((annotation) => {
                    // Convert PDF coordinates back to screen coordinates
                    const pageWidth = pageDimensions?.width || 600;
                    const pageHeight = pageDimensions?.height || 800;

                    // Find the actual Page element position
                    const pageElement = pdfContainerRef.current?.querySelector('.react-pdf__Page');
                    const pageRect = pageElement?.getBoundingClientRect();
                    const containerRect = pdfContainerRef.current?.getBoundingClientRect();

                    if (!pageRect || !containerRect) return null;

                    // Calculate position relative to the container
                    const relativeX = pageRect.left - containerRect.left;
                    const relativeY = pageRect.top - containerRect.top;

                    // Scale coordinates based on current zoom
                    const scaledX = (annotation.x / pageWidth) * (pageRect.width / pdfScale);
                    const scaledY = ((pageHeight - annotation.y) / pageHeight) * (pageRect.height / pdfScale);

                    const screenX = relativeX + scaledX;
                    const screenY = relativeY + scaledY;

                    // Calculate dimensions for shape annotations
                    let width = 'auto';
                    let height = 'auto';
                    if (annotation.width && annotation.height) {
                      width = `${(annotation.width / pageWidth) * (pageRect.width / pdfScale)}px`;
                      height = `${(annotation.height / pageHeight) * (pageRect.height / pdfScale)}px`;
                    }

                    return (
                      <div
                        key={annotation.id}
                        className={`absolute border-2 border-primary bg-primary/10 p-2 rounded text-xs shadow-lg cursor-pointer hover:bg-primary/20 transition-colors ${
                          annotation.type === 'highlight' || annotation.type === 'rectangle'
                            ? 'flex items-center justify-center'
                            : ''
                        }`}
                        style={{
                          left: `${screenX}px`,
                          top: `${screenY}px`,
                          width: width !== 'auto' ? width : undefined,
                          height: height !== 'auto' ? height : undefined,
                          transform: width === 'auto' ? 'translate(-50%, -50%)' : 'none',
                          maxWidth: width === 'auto' ? '200px' : undefined,
                          zIndex: 10
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAnnotation(annotation);
                        }}
                      >
                        {annotation.type === 'text' || annotation.type === 'comment' ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-primary">{annotation.type}</div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAnnotation(annotation);
                                  }}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAnnotation(annotation.id);
                                  }}
                                >
                                  <AlertCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {annotation.text && <div className="mt-1">{annotation.text}</div>}
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(annotation.timestamp).toLocaleTimeString()}
                            </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-primary text-xs">{annotation.type}</div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAnnotation(annotation);
                                  }}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAnnotation(annotation.id);
                                  }}
                                >
                                  <AlertCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {annotation.text && <div className="mt-1 text-xs">{annotation.text}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Zoom controls */}
                <div className="absolute top-2 right-2 flex gap-1 bg-background/80 backdrop-blur-sm rounded p-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPdfScale(Math.max(0.5, pdfScale - 0.1));
                    }}
                    disabled={pdfScale <= 0.5}
                  >
                    -
                  </Button>
                  <span className="text-xs px-2 py-1">{Math.round(pdfScale * 100)}%</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPdfScale(Math.min(2.0, pdfScale + 0.1));
                    }}
                    disabled={pdfScale >= 2.0}
                  >
                    +
                  </Button>
                </div>

                {/* Page navigation */}
                <div className="absolute bottom-2 right-2 flex gap-1 bg-background/80 backdrop-blur-sm rounded p-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(Math.max(1, currentPage - 1));
                    }}
                    disabled={currentPage <= 1}
                  >
                    ←
                  </Button>
                  <span className="text-xs px-2 py-1">
                    {currentPage} / {documentInfo?.pages || 1}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(Math.min(documentInfo?.pages || 1, currentPage + 1));
                    }}
                    disabled={currentPage >= (documentInfo?.pages || 1)}
                  >
                    →
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={!documentId || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!documentId || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Properties Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {documentInfo ? (
              <>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Pages:</span> {documentInfo.pages}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Size:</span> {formatFileSize(documentInfo.size)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Annotations:</span> {documentInfo.annotations}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Created:</span> {new Date(documentInfo.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Modified:</span> {new Date(documentInfo.lastModified).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <h4 className="font-medium text-sm">Recent Annotations</h4>
                  {isLoadingAnnotations ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : recentAnnotations.length > 0 ? (
                    <div className="space-y-2">
                      {recentAnnotations.map((annotation) => (
                        <div key={annotation.id} className="p-2 border rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-xs">{annotation.type}</Badge>
                            <span className="text-muted-foreground">Page {annotation.page}</span>
                          </div>
                          <div className="font-medium mb-1">
                            {annotation.text || `${annotation.type} annotation`}
                          </div>
                          <div className="text-muted-foreground">
                            {annotation.author || "Unknown"} • {new Date(annotation.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No annotations yet</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <FileIcon className="h-12 w-12 mx-auto mb-4" />
                <p>Upload a PDF to see document information</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Annotation Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                Text annotations
              </li>
              <li className="flex items-center gap-2">
                <Highlighter className="h-4 w-4 text-warning" />
                Highlighting
              </li>
              <li className="flex items-center gap-2">
                <Square className="h-4 w-4 text-accent" />
                Shapes & drawings
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-success" />
                Comments & notes
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Redaction Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Permanent text removal</li>
              <li>• Image redaction</li>
              <li>• Metadata cleaning</li>
              <li>• Secure redaction</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Watermark Options</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Text watermarks</li>
              <li>• Image watermarks</li>
              <li>• Transparent overlays</li>
              <li>• Position control</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Edit Annotation Dialog */}
      {editingAnnotation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="text-base">Edit Annotation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-annotation-text">Annotation Text</Label>
                <Textarea
                  id="edit-annotation-text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Enter annotation text..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateAnnotation} className="flex-1">
                  Update
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAnnotation(null);
                    setEditText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
