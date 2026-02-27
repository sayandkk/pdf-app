import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Upload, Download, FileIcon, PenTool, Mail, Calendar,
  Check, Clock, AlertCircle, UserPlus, Send, Shield, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, analyticsApi, eSignatureApi } from "@/lib/api";

// Types
interface Signature {
  id: string;
  name: string;
  style: string;
  created: string;
}

interface Document {
  id: string;
  userId: string;
  title: string;
  originalFileName: string;
  status: 'draft' | 'pending' | 'completed';
  created: string;
  deadline?: string;
  message?: string;
  signers: Signer[];
  completedSigners: number;
}

interface Signer {
  id: string;
  name: string;
  email: string;
  role?: string;
  status: 'sent' | 'pending' | 'signed';
  signedAt?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800";
    case "pending": return "bg-yellow-100 text-yellow-800";
    case "draft": return "bg-gray-100 text-gray-800";
    case "signed": return "bg-green-100 text-green-800";
    case "sent": return "bg-blue-100 text-blue-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
    case "signed":
      return <Check className="h-4 w-4" />;
    case "pending":
    case "sent":
      return <Clock className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

export const ESignature = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }
  // State
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsToSign, setDocumentsToSign] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [selectedDocumentToSign, setSelectedDocumentToSign] = useState<Document | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<string>('');

  // Form states
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signatureMessage, setSignatureMessage] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [signers, setSigners] = useState<Signer[]>([]);

  // New signature form
  const [newSignatureName, setNewSignatureName] = useState("");
  const [newSignatureStyle, setNewSignatureStyle] = useState("cursive");

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSignatures();
      loadDocuments();
      loadDocumentsToSign();
    }
  }, [isAuthenticated]);

  // API Functions
  const loadSignatures = async () => {
    try {
      const data = await eSignatureApi.getSignatures();
      setSignatures(data);
    } catch (error) {
      toast.error("Failed to load signatures");
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await eSignatureApi.getDocuments();
      setDocuments(data);
    } catch (error) {
      toast.error("Failed to load documents");
    }
  };

  const loadDocumentsToSign = async () => {
    try {
      const data = await eSignatureApi.getDocuments();

      // Filter documents where current user needs to sign OR is the owner with pending signers
      const pendingDocs = data.filter((doc: Document) => {
        // Check if user is a pending signer
        const isPendingSigner = doc.signers.some((signer: Signer) =>
          signer.email === user?.email && signer.status === 'pending'
        );

        // Check if user is the owner and document has pending signers
        const isOwnerWithPendingSigners = doc.userId === user?.id &&
          doc.signers.some((signer: Signer) => signer.status === 'pending');

        return isPendingSigner || isOwnerWithPendingSigners;
      });

      setDocumentsToSign(pendingDocs);
    } catch (error) {
      toast.error("Failed to load documents to sign");
    }
  };

  const createSignature = async () => {
    if (!newSignatureName.trim()) {
      toast.error("Please enter a signature name");
      return;
    }

    setLoading(true);
    try {
      await eSignatureApi.createSignature({
        name: newSignatureName,
        style: newSignatureStyle
      });

      toast.success("Signature created successfully!");
      setNewSignatureName("");
      loadSignatures();
    } catch (error) {
      toast.error("Failed to create signature");
    } finally {
      setLoading(false);
    }
  };

  const sendForSignature = async () => {
    if (!selectedDocument || !documentTitle.trim()) {
      toast.error("Please select a document and enter a title");
      return;
    }
    if (signers.length === 0) {
      toast.error("Please add at least one signer");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedDocument);
      formData.append('title', documentTitle);
      formData.append('message', signatureMessage);
      if (deadline) formData.append('deadline', deadline);
      formData.append('signers', JSON.stringify(signers));

      await eSignatureApi.sendForSignature(formData);

      toast.success("Document sent for signature!");
      setSelectedDocument(null);
      setDocumentTitle("");
      setSignatureMessage("");
      setDeadline("");
      setSigners([]);
      loadDocuments();
      loadDocumentsToSign();
    } catch (error) {
      toast.error("Failed to send document for signature");
    } finally {
      setLoading(false);
    }
  };

  const signDocument = async () => {
    if (!selectedDocumentToSign || !selectedSignature) {
      toast.error("Please select a document and signature");
      return;
    }

    setLoading(true);
    try {
      await eSignatureApi.signDocument(selectedDocumentToSign.id, {
        signatureId: selectedSignature
      });

      toast.success("Document signed successfully!");
      setSelectedDocumentToSign(null);
      setSelectedSignature("");
      loadDocuments();
      loadDocumentsToSign();
    } catch (error) {
      toast.error("Failed to sign document");
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (documentId: string) => {
    try {
      const blob = await eSignatureApi.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const viewDocument = async (documentId: string) => {
    try {
      const blob = await eSignatureApi.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      toast.error("Failed to view document");
    }
  };

  const deleteSignature = async (signatureId: string) => {
    if (!confirm("Are you sure you want to delete this signature?")) {
      return;
    }

    setLoading(true);
    try {
      await eSignatureApi.deleteSignature(signatureId);
      toast.success("Signature deleted successfully!");
      loadSignatures();
    } catch (error) {
      toast.error("Failed to delete signature");
    } finally {
      setLoading(false);
    }
  };

  const addSigner = () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      toast.error("Please enter both name and email");
      return;
    }

    const newSigner: Signer = {
      id: Date.now().toString(),
      name: signerName,
      email: signerEmail,
      status: 'pending'  // Changed from 'sent' to 'pending'
    };

    setSigners([...signers, newSigner]);
    setSignerName("");
    setSignerEmail("");
  };

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <PenTool className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">E-Signature</h1>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <Shield className="h-3 w-3 mr-1" />
          Legally Binding
        </Badge>
      </div>

      <Tabs defaultValue="sign" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sign">Sign Document</TabsTrigger>
          <TabsTrigger value="send">Send for Signature</TabsTrigger>
          <TabsTrigger value="manage">Manage Documents</TabsTrigger>
          <TabsTrigger value="signatures">My Signatures</TabsTrigger>
        </TabsList>

        {/* Sign Document Tab */}
        <TabsContent value="sign" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Documents Awaiting Your Signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {documentsToSign.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileIcon className="h-12 w-12 mx-auto mb-4" />
                    <p>No documents awaiting your signature</p>
                    <p className="text-sm">Documents sent to you for signature will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documentsToSign.map((doc) => (
                      <div
                        key={doc.id}
                        className={`border rounded-lg p-4 cursor-pointer hover:bg-muted/50 ${
                          selectedDocumentToSign?.id === doc.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedDocumentToSign(doc)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <FileIcon className="h-8 w-8 text-red-500" />
                          <div>
                            <div className="font-medium">{doc.title}</div>
                            <div className="text-sm text-muted-foreground">
                              From: {doc.signers.find(s => s.status === 'pending')?.name || 'Unknown'}
                              • Sent: {new Date(doc.created).toLocaleDateString()}
                              {doc.deadline && ` • Due: ${new Date(doc.deadline).toLocaleDateString()}`}
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Awaiting Signature
                          </Badge>
                        </div>
                        {doc.message && (
                          <div className="text-sm text-muted-foreground bg-muted/20 p-2 rounded">
                            "{doc.message}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={signDocument}
                  disabled={!selectedDocumentToSign || !selectedSignature || loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PenTool className="h-4 w-4 mr-2" />
                  )}
                  Sign Selected Document
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select Signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {signatures.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <PenTool className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No signatures found</p>
                    <p className="text-xs">Create a signature first</p>
                  </div>
                ) : (
                  signatures.map((signature) => (
                    <div
                      key={signature.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                        selectedSignature === signature.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedSignature(signature.id)}
                    >
                      <div className="font-medium text-sm mb-1">{signature.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {signature.style} style • Created {new Date(signature.created).toLocaleDateString()}
                      </div>
                      <div className="mt-2 p-2 bg-white border rounded text-center">
                        <div className="font-signature text-lg">
                          {signature.style === "initials" ? signature.name.split(' ').map(n => n[0]).join('').toUpperCase() : signature.name}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <Button variant="outline" className="w-full" onClick={() => setNewSignatureName("New Signature")}>
                  <PenTool className="h-4 w-4 mr-2" />
                  Create New Signature
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Send for Signature Tab */}
        <TabsContent value="send" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedDocument(e.target.files?.[0] || null)}
                    className="hidden"
                    id="send-document-upload"
                  />
                  <label htmlFor="send-document-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium mb-2">Upload document</p>
                    <Button type="button" size="sm" asChild>
                      <span>Choose File</span>
                    </Button>
                  </label>
                </div>

                {selectedDocument && (
                  <div className="p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium">{selectedDocument.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(selectedDocument.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="doc-title">Document Title</Label>
                    <Input
                      id="doc-title"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="Enter document title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Message to Signers</Label>
                    <Textarea
                      id="message"
                      value={signatureMessage}
                      onChange={(e) => setSignatureMessage(e.target.value)}
                      placeholder="Please review and sign this document..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Signing Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add Signers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="signer-name">Full Name</Label>
                    <Input
                      id="signer-name"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Enter signer's name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signer-email">Email Address</Label>
                    <Input
                      id="signer-email"
                      type="email"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                  <Button variant="outline" className="w-full" onClick={addSigner}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Signer
                  </Button>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <Label>Current Signers ({signers.length})</Label>
                  {signers.map((signer, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {signer.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{signer.name}</div>
                          <div className="text-xs text-muted-foreground">{signer.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(signer.status)}>
                          {getStatusIcon(signer.status)}
                          <span className="ml-1 capitalize">{signer.status}</span>
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSigner(index)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  onClick={sendForSignature}
                  disabled={!selectedDocument || !documentTitle.trim() || signers.length === 0 || loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send for Signature
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Manage Documents Tab */}
        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Status</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileIcon className="h-12 w-12 mx-auto mb-4" />
                  <p>No documents found</p>
                  <p className="text-sm">Documents you send for signature will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-8 w-8 text-red-500" />
                        <div>
                          <div className="font-medium">{doc.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {doc.completedSigners}/{doc.signers.length} signatures •
                            Created {new Date(doc.created).toLocaleDateString()}
                            {doc.deadline && ` • Due ${new Date(doc.deadline).toLocaleDateString()}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(doc.status)}>
                          {getStatusIcon(doc.status)}
                          <span className="ml-1 capitalize">{doc.status}</span>
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewDocument(doc.id)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDocument(doc.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Signatures Tab */}
        <TabsContent value="signatures" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signatures.map((signature) => (
              <Card key={signature.id}>
                <CardHeader>
                  <CardTitle className="text-base">{signature.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-[3/1] border rounded-lg flex items-center justify-center bg-white">
                    <div className="font-signature text-xl">
                      {signature.style === "initials" ? signature.name.split(' ').map(n => n[0]).join('').toUpperCase() : signature.name}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{signature.style} style</span>
                    <span className="text-muted-foreground">{new Date(signature.created).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">Edit</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => deleteSignature(signature.id)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Signature Card */}
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Create New Signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new-sig-name">Signature Name</Label>
                  <Input
                    id="new-sig-name"
                    value={newSignatureName}
                    onChange={(e) => setNewSignatureName(e.target.value)}
                    placeholder="Enter signature name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-sig-style">Style</Label>
                  <select
                    id="new-sig-style"
                    value={newSignatureStyle}
                    onChange={(e) => setNewSignatureStyle(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="cursive">Cursive</option>
                    <option value="print">Print</option>
                    <option value="initials">Initials</option>
                  </select>
                </div>
                <div className="aspect-[3/1] border rounded-lg flex items-center justify-center bg-white">
                  <div className="font-signature text-xl">
                    {newSignatureStyle === "initials" ? newSignatureName.split(' ').map(n => n[0]).join('').toUpperCase() : newSignatureName || 'Preview'}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={createSignature}
                  disabled={!newSignatureName.trim() || loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PenTool className="h-4 w-4 mr-2" />
                  )}
                  Create Signature
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>E-Signature Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="font-medium">Legally Binding</div>
              <div className="text-sm text-muted-foreground">Compliant with e-signature laws</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Calendar className="h-8 w-8 text-accent mx-auto mb-2" />
              <div className="font-medium">Deadline Tracking</div>
              <div className="text-sm text-muted-foreground">Automatic reminders</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Mail className="h-8 w-8 text-success mx-auto mb-2" />
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-muted-foreground">Real-time status updates</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Download className="h-8 w-8 text-warning mx-auto mb-2" />
              <div className="font-medium">Audit Trail</div>
              <div className="text-sm text-muted-foreground">Complete signing history</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};