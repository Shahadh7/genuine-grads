'use client';
import React from "react"
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Plus, 
  Save, 
  Download, 
  Upload, 
  Eye, 
  EyeOff,
  Palette,
  Type,
  QrCode,
  Image,
  Trash2,
  Move,
  Settings,
  FileText,
  Award,
  FolderOpen,
  RotateCcw,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { graphqlClient } from '@/lib/graphql-client';
import { useToast } from '@/hooks/useToast';

// Sample data for preview mode
const sampleData = {
  student_name: "Ayesha Perera",
  certificate_title: "Bachelor of IT",
  gpa: "3.95",
  badge_title: "Dean's List",
  university_name: "Tech University",
  course: "Computer Science",
  graduation_date: "2024-05-15",
  student_id: "STU2024001"
};

// Available placeholders
const availablePlaceholders = [
  { key: 'student_name', label: 'Student Name', value: sampleData.student_name },
  { key: 'certificate_title', label: 'Certificate Title', value: sampleData.certificate_title },
  { key: 'gpa', label: 'GPA', value: sampleData.gpa },
  { key: 'badge_title', label: 'Badge Title', value: sampleData.badge_title },
  { key: 'university_name', label: 'University Name', value: sampleData.university_name },
  { key: 'course', label: 'Course', value: sampleData.course },
  { key: 'graduation_date', label: 'Graduation Date', value: sampleData.graduation_date },
  { key: 'student_id', label: 'Student ID', value: sampleData.student_id }
];

// Default template
const defaultTemplate = {
  templateId: "template_default_2025",
  universityId: "uni_default",
  backgroundImage: null,
  elements: [
    {
      id: "title",
      type: "placeholder",
      value: "{certificate_title}",
      x: 200,
      y: 100,
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
      color: "#1f2937"
    },
    {
      id: "student-name",
      type: "placeholder",
      value: "{student_name}",
      x: 200,
      y: 200,
      fontSize: 18,
      fontWeight: "semibold",
      textAlign: "center",
      color: "#374151"
    },
    {
      id: "awarded-by",
      type: "static_text",
      value: "Awarded By",
      x: 150,
      y: 300,
      fontSize: 14,
      fontWeight: "normal",
      textAlign: "left",
      color: "#6b7280"
    },
    {
      id: "university-name",
      type: "placeholder",
      value: "{university_name}",
      x: 150,
      y: 320,
      fontSize: 16,
      fontWeight: "semibold",
      textAlign: "left",
      color: "#374151"
    },
    {
      id: "qr-placeholder",
      type: "qr_placeholder",
      x: 450,
      y: 500,
      width: 100,
      height: 100
    }
  ]
};

interface Props {
  // Add props here
}

export default function CertificateDesignerPage(): React.JSX.Element {
  const toast = useToast();
  const [elements, setElements] = useState<any>([]);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<any>(false);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [isDragging, setIsDragging] = useState<any>(false);
  const [dragOffset, setDragOffset] = useState<any>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<any>(1);
  const [showGrid, setShowGrid] = useState<any>(false);
  const [isFullscreen, setIsFullscreen] = useState<any>(false);
  const [backgroundColor, setBackgroundColor] = useState<any>('#ffffff');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);

  const normalizeTemplate = useCallback((template: any) => {
    const design = template?.designTemplate ?? {};
    return {
      ...template,
      templateFields: template?.templateFields ?? {},
      designTemplate: {
        backgroundColor: design?.backgroundColor ?? '#ffffff',
        elements: Array.isArray(design?.elements) ? design.elements : [],
      },
    };
  }, []);
  
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const response = await graphqlClient.getCertificateTemplates();
      if ((response as any)?.errors?.length) {
        throw new Error(response.errors[0]?.message ?? 'Failed to load templates');
      }
      const templates = response.data?.certificateTemplates ?? [];
      setSavedTemplates(templates.map((template: any) => normalizeTemplate(template)));
    } catch (error: any) {
      console.error('Failed to load templates', error);
      toast.error({
        title: 'Unable to load templates',
        description: error?.message || 'Please try again later.',
      });
    } finally {
      setTemplatesLoading(false);
    }
  }, [normalizeTemplate, toast]);


  // Load default template on mount
  useEffect(() => {
    setElements(defaultTemplate.elements);
    setCurrentTemplate(defaultTemplate);
  }, []);
  

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const buildTemplateFieldSchema = useCallback(() => {
    const schema: Record<string, string> = {};

    elements
      .filter((el: any) => el.type === 'placeholder' && typeof el.value === 'string')
      .forEach((el: any) => {
        const key = el.value.replace(/[{}]/g, '').trim();
        if (key.length > 0 && !schema[key]) {
          schema[key] = 'string';
        }
      });

    return schema;
  }, [elements]);

  

  

  const addElement = (type, value = '') => {
    const newElement = {
      id: `${type}-${Date.now()}`,
      type,
      value,
      x: 100,
      y: 100,
      fontSize: type === 'placeholder' ? 16 : 14,
      fontWeight: type === 'placeholder' ? 'semibold' : 'normal',
      textAlign: 'left',
      color: '#374151'
    };

    if (type === 'qr_placeholder') {
      newElement.width = 100;
      newElement.height = 100;
    }

    if (type === 'image') {
      newElement.width = 100;
      newElement.height = 100;
      newElement.src = null;
    }

    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const updateElement = (id, updates) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (id) => {
    setElements(elements.filter(el => el.id !== id));
    setSelectedElement(null);
  };

  const handleElementClick = (id) => {
    setSelectedElement(id);
  };

  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedElement(null);
    }
  };

  const saveTemplate = async () => {
    if (savingTemplate) {
      return;
    }

    const templateName = prompt('Enter template name:');
    if (!templateName || templateName.trim().length === 0) {
      return;
    }

    const degreeInput = prompt('Enter degree type (e.g. Bachelor, Diploma):', 'Certificate');
    if (degreeInput === null) {
      return;
    }

    const descriptionInput = prompt('Optional description for this template:');
    const templateFields = buildTemplateFieldSchema();

    setSavingTemplate(true);
    try {
      const response = await graphqlClient.createCertificateTemplate({
        name: templateName.trim(),
        degreeType: degreeInput?.trim() || 'Certificate',
        description: descriptionInput?.trim() || undefined,
        templateFields,
        designTemplate: {
          backgroundColor,
          elements,
        },
        backgroundImage: null,
      });

      if ((response as any)?.errors?.length) {
        throw new Error(response.errors[0]?.message ?? 'Failed to save template');
      }

      const created = response.data?.createCertificateTemplate;
      if (created) {
        const normalized = normalizeTemplate(created);
        setSavedTemplates((prev) => [normalized, ...prev.filter((template) => template.id !== normalized.id)]);
        setCurrentTemplate(normalized);
        setBackgroundColor(normalized.designTemplate?.backgroundColor ?? '#ffffff');
        setElements(normalized.designTemplate?.elements ?? elements);
      }

      await fetchTemplates();

      toast.success({
        title: 'Template saved',
        description: 'Certificate template stored in your university workspace.',
      });
    } catch (error: any) {
      console.error('Failed to save template', error);
      toast.error({
        title: 'Failed to save template',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const loadTemplate = (template) => {
    const normalized = normalizeTemplate(template);
    setElements(normalized.designTemplate?.elements ?? []);
    setBackgroundColor(normalized.designTemplate?.backgroundColor ?? '#ffffff');
    setCurrentTemplate(normalized);
    setSelectedElement(null);
  };

  const clearCanvas = () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
      setElements([]);
      setSelectedElement(null);
    }
  };

  const exportTemplate = () => {
    const design = currentTemplate?.designTemplate ?? {
      backgroundColor,
      elements,
    };

    const template = {
      templateId: currentTemplate?.templateId || currentTemplate?.id || `template_${Date.now()}`,
      universityId: currentTemplate?.universityId || "uni_default",
      backgroundImage: currentTemplate?.backgroundImage || null,
      backgroundColor: design.backgroundColor ?? backgroundColor,
      elements: design.elements ?? elements,
    };
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.templateId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMouseDown = (e, elementId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - element.x;
    const offsetY = e.clientY - rect.top - element.y;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    setSelectedElement(elementId);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedElement) return;
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const newX = Math.max(0, Math.min(e.clientX - canvasRect.left - dragOffset.x, canvasRect.width - 100));
    const newY = Math.max(0, Math.min(e.clientY - canvasRect.top - dragOffset.y, canvasRect.height - 50));
    
    updateElement(selectedElement, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleImageUpload = (elementId, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateElement(elementId, { src: e.target.result });
    };
    reader.readAsDataURL(file);
  };

  const triggerImageUpload = (elementId) => {
    if (fileInputRef.current) {
      fileInputRef.current.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          handleImageUpload(elementId, file);
        }
      };
      fileInputRef.current.click();
    }
  };

  const getDisplayValue = (element) => {
    if (element.type === 'static_text') return element.value;
    if (element.type === 'placeholder') {
      const key = element.value.replace(/[{}]/g, '');
      return isPreviewMode ? sampleData[key] || element.value : element.value;
    }
    return element.value;
  };

  const handleZoom = (direction) => {
    const newZoom = direction === 'in' ? Math.min(zoom * 1.2, 3) : Math.max(zoom / 1.2, 0.5);
    setZoom(newZoom);
  };

  const resetZoom = () => {
    setZoom(1);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasContainerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err: any) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err: any) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && selectedElement) {
        deleteElement(selectedElement);
      }
      if (e.key === 'Escape') {
        setSelectedElement(null);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoom('in');
        }
        if (e.key === '-') {
          e.preventDefault();
          handleZoom('out');
        }
        if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, zoom]);

  // Mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, selectedElement, dragOffset]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const selectedElementData = elements.find(el => el.id === selectedElement);
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Certificate Designer</h1>
            <p className="text-muted-foreground">Design custom NFT certificate templates for GenuineGrads</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
              className={showGrid ? 'bg-primary text-primary-foreground' : ''}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('out')}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className={isFullscreen ? 'bg-primary text-primary-foreground' : ''}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('in')}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: backgroundColor }}
                  />
                  <span className="text-xs">BG</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <h4 className="font-medium">Background Color</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8',
                      '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706',
                      '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a',
                      '#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626',
                      '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea',
                      '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7'
                    ].map(color => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border-2 hover:border-primary transition-colors"
                        style={{ backgroundColor: color }}
                        onClick={() => setBackgroundColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={backgroundColor}
                      onChange={(e: any) => setBackgroundColor(e.target.value)}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e: any) => setBackgroundColor(e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Load Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => loadTemplate(defaultTemplate)}>
                  Default Template
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => fetchTemplates()}
                  disabled={templatesLoading}
                >
                  {templatesLoading ? 'Refreshing…' : 'Refresh Templates'}
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  Saved Templates
                </DropdownMenuItem>
                {templatesLoading ? (
                  <DropdownMenuItem disabled className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading templates...
                  </DropdownMenuItem>
                ) : savedTemplates.length > 0 ? (
                  savedTemplates.map((template: any) => (
                    <DropdownMenuItem
                      key={template.id ?? template.templateId}
                      onClick={() => loadTemplate(template)}
                    >
                      {template.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No saved templates</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant={isPreviewMode ? "default" : "outline"}
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="flex items-center gap-2"
            >
              {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isPreviewMode ? 'Edit Mode' : 'Preview Mode'}
            </Button>
            <Button
              onClick={saveTemplate}
              className="flex items-center gap-2"
              disabled={savingTemplate}
            >
              {savingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Template
                </>
              )}
            </Button>
            <Button onClick={exportTemplate} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        {currentTemplate && (
          <div className="text-sm text-muted-foreground mt-2">
            Current Template: {currentTemplate.name || currentTemplate.templateId} • {elements.length} elements • Zoom: {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <div className="w-80 border-r bg-card p-4 space-y-6 overflow-y-auto">
          <Tabs defaultValue="elements" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="elements">Elements</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
            </TabsList>

            <TabsContent value="elements" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Add Elements</h3>
                <div className="space-y-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Type className="h-4 w-4 mr-2" />
                        Add Placeholder
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {availablePlaceholders.map((placeholder: any) => (
                        <DropdownMenuItem
                          key={placeholder.key}
                          onClick={() => addElement('placeholder', `{${placeholder.key}}`)}
                        >
                          <div className="flex flex-col">
                            <span>{placeholder.label}</span>
                            <span className="text-xs text-muted-foreground">{placeholder.value}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addElement('static_text', 'Custom Text')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Add Static Text
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addElement('image')}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addElement('qr_placeholder')}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Insert QR Placeholder
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Canvas Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={clearCanvas}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear Canvas
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Delete selected:</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Delete</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Deselect:</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Escape</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Zoom in:</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl + +</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Zoom out:</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl + -</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Reset zoom:</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl + 0</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Toggle fullscreen:</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">F</kbd>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="properties" className="space-y-4">
              {selectedElementData ? (
                <div className="space-y-4">
                  {selectedElementData.type !== 'qr_placeholder' && (
                    <div>
                      <Label>Text Content</Label>
                      <Input
                        value={selectedElementData.value || ''}
                        onChange={(e: any) => updateElement(selectedElementData.id, { value: e.target.value })}
                        disabled={selectedElementData.type === 'qr_placeholder'}
                      />
                    </div>
                  )}

                  {selectedElementData.type === 'image' && (
                    <div>
                      <Label>Image</Label>
                      <div className="space-y-2">
                        {selectedElementData.src ? (
                          <div className="relative">
                            <img
                              src={selectedElementData.src}
                              alt="Logo/Seal"
                              className="w-full h-20 object-contain border rounded"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => triggerImageUpload(selectedElementData.id)}
                              className="mt-2 w-full"
                            >
                              Change Image
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => triggerImageUpload(selectedElementData.id)}
                            className="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedElementData.type !== 'qr_placeholder' && (
                    <>
                      <div>
                        <Label>Font Size</Label>
                        <Select
                          value={selectedElementData.fontSize?.toString()}
                          onValueChange={(value) => updateElement(selectedElementData.id, { fontSize: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(size => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}px
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Font Weight</Label>
                        <Select
                          value={selectedElementData.fontWeight}
                          onValueChange={(value) => updateElement(selectedElementData.id, { fontWeight: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="semibold">Semibold</SelectItem>
                            <SelectItem value="bold">Bold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Text Alignment</Label>
                        <Select
                          value={selectedElementData.textAlign}
                          onValueChange={(value) => updateElement(selectedElementData.id, { textAlign: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Text Color</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <div
                                className="w-4 h-4 rounded mr-2 border"
                                style={{ backgroundColor: selectedElementData.color }}
                              />
                              {selectedElementData.color}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="grid grid-cols-6 gap-2">
                              {['#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#ffffff', '#FFD700', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2'].map(color => (
                                <button
                                  key={color}
                                  className="w-8 h-8 rounded border-2 hover:border-primary"
                                  style={{ backgroundColor: color }}
                                  onClick={() => updateElement(selectedElementData.id, { color })}
                                />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}

                  {(selectedElementData.type === 'qr_placeholder' || selectedElementData.type === 'image') && (
                    <>
                      <div>
                        <Label>Width</Label>
                        <Input
                          type="number"
                          value={selectedElementData.width || 100}
                          onChange={(e: any) => updateElement(selectedElementData.id, { width: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Height</Label>
                        <Input
                          type="number"
                          value={selectedElementData.height || 100}
                          onChange={(e: any) => updateElement(selectedElementData.id, { height: parseInt(e.target.value) })}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    variant="destructive"
                    onClick={() => deleteElement(selectedElementData.id)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Element
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select an element to edit its properties
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas */}
        <div 
          ref={canvasContainerRef}
          className="flex-1 flex items-center justify-center p-8 bg-muted/20 overflow-auto"
        >
          <div
            ref={canvasRef}
            className={`relative bg-white border-2 border-dashed border-muted-foreground/20 rounded-lg shadow-lg ${
              isDragging ? 'cursor-grabbing' : 'cursor-default'
            }`}
            style={{
              width: '800px',
              height: '600px',
              aspectRatio: '4/3',
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
              backgroundColor: backgroundColor,
              backgroundImage: showGrid ? 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)' : 'none',
              backgroundSize: '20px 20px'
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <Award className="w-64 h-64 text-muted-foreground" />
            </div>

            {/* Elements */}
            {elements.map((element: any) => (
              <div
                key={element.id}
                className={`absolute select-none ${
                  selectedElement === element.id ? 'ring-2 ring-primary ring-offset-2' : ''
                } ${isDragging && selectedElement === element.id ? 'z-50 cursor-grabbing shadow-lg' : 'cursor-grab'}`}
                style={{
                  left: element.x,
                  top: element.y,
                  fontSize: element.fontSize,
                  fontWeight: element.fontWeight,
                  color: element.color,
                  textAlign: element.textAlign,
                  width: element.width || 'auto',
                  height: element.height || 'auto',
                  userSelect: 'none',
                  pointerEvents: 'auto'
                }}
                onClick={(e: any) => {
                  if (!isDragging) {
                    e.stopPropagation();
                    handleElementClick(element.id);
                  }
                }}
                onMouseDown={(e) => handleMouseDown(e, element.id)}
                onDoubleClick={(e) => {
                  if (element.type === 'image') {
                    e.stopPropagation();
                    triggerImageUpload(element.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${element.type} element`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleElementClick(element.id);
                  }
                }}
              >
                {element.type === 'qr_placeholder' ? (
                  <div
                    className="border-2 border-dashed border-muted-foreground/50 bg-muted/20 flex items-center justify-center overflow-hidden"
                    style={{
                      width: element.width || 100,
                      height: element.height || 100
                    }}
                  >
                    {isPreviewMode ? (
                      <QRCode
                        value="https://genuinegrads.xyz/verify?asset=demo123"
                        size={Math.min(element.width || 100, element.height || 100) - 10}
                        level="M"
                        fgColor="#000000"
                        bgColor="#ffffff"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <QrCode className="w-8 h-8 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">QR Placeholder</span>
                      </div>
                    )}
                  </div>
                ) : element.type === 'image' ? (
                  <div
                    className="border-2 border-dashed border-muted-foreground/50 flex items-center justify-center overflow-hidden"
                    style={{
                      width: element.width || 100,
                      height: element.height || 100,
                      backgroundColor: element.src ? 'transparent' : 'rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {element.src ? (
                      <img
                        src={element.src}
                        alt="Logo/Seal"
                        className="w-full h-full object-contain"
                        style={{
                          maxWidth: element.width || 100,
                          maxHeight: element.height || 100
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <Image className="w-8 h-8 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Click to upload</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-2 py-1">
                    {getDisplayValue(element)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
      />
    </div>
  );
} 