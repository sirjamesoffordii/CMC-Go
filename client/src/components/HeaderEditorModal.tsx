import { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Pencil,
  X,
  Upload,
  Type,
  ChevronDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderEditorModalProps {
  open: boolean;
  onClose: () => void;
  logoUrl: string | null;
  headerText: string;
  backgroundColor: string;
  onSave: (data: { logoFile?: File; headerText: string; backgroundColor: string }) => void;
}

const fontFamilies = [
  { name: 'Default (Inter)', value: 'Inter, sans-serif' },
  { name: 'Brush Script MT', value: 'Brush Script MT, cursive' },
  { name: 'Serif (Georgia)', value: 'Georgia, serif' },
  { name: 'Monospace', value: 'monospace' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
];

const fontSizes = [
  { name: 'Extra Small', value: '12px' },
  { name: 'Small', value: '14px' },
  { name: 'Normal', value: '16px' },
  { name: 'Medium', value: '18px' },
  { name: 'Large', value: '22px' },
  { name: 'Extra Large', value: '28px' },
  { name: 'Huge', value: '36px' },
];

const presetColors = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#1f2937' },
  { name: 'Chi Alpha Red', value: '#ED1C24' },
  { name: 'Navy Blue', value: '#1e3a5f' },
  { name: 'Dark Green', value: '#14532d' },
  { name: 'Purple', value: '#581c87' },
  { name: 'Dark Brown', value: '#451a03' },
  { name: 'Slate', value: '#334155' },
  { name: 'White', value: '#ffffff' },
];

export function HeaderEditorModal({
  open,
  onClose,
  logoUrl: initialLogoUrl,
  headerText: initialHeaderText,
  backgroundColor: initialBgColor,
  onSave,
}: HeaderEditorModalProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgColor, setBgColor] = useState(initialBgColor || '#000000');
  const [currentFontFamily, setCurrentFontFamily] = useState('Inter, sans-serif');
  const [currentFontSize, setCurrentFontSize] = useState('18px');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      Color,
    ],
    content: initialHeaderText || '<p style="color: white; font-size: 18px;">Chi Alpha Campus Ministries</p>',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[40px] px-2 py-1',
      },
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setLogoPreview(initialLogoUrl);
      setLogoFile(null);
      setBgColor(initialBgColor || '#000000');
      if (editor) {
        editor.commands.setContent(initialHeaderText || '<p style="color: white; font-size: 18px;">Chi Alpha Campus Ministries</p>');
      }
    }
  }, [open, initialLogoUrl, initialHeaderText, initialBgColor, editor]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    onSave({
      logoFile: logoFile || undefined,
      headerText: editor?.getHTML() || '',
      backgroundColor: bgColor,
    });
    onClose();
  };

  const isLightBackground = bgColor === '#ffffff' || bgColor === '#FFFFFF' || bgColor.toLowerCase() === '#fff';
  const textColor = isLightBackground ? '#000000' : '#ffffff';

  const setTextColor = (color: string) => {
    editor?.chain().focus().selectAll().setColor(color).run();
  };

  // Update text color when background changes
  useEffect(() => {
    if (editor) {
      setTextColor(textColor);
    }
  }, [bgColor, editor]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Header
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Live Preview */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Preview</label>
            <div 
              className="rounded-lg overflow-hidden border border-gray-200 shadow-sm"
              style={{ backgroundColor: bgColor }}
            >
              <div className="h-[60px] flex items-center px-4">
                {/* Logo Preview */}
                <div className="flex-shrink-0 h-10 w-10 mr-4">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo" 
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        console.error('Error loading logo preview:', logoPreview);
                        (e.target as HTMLImageElement).src = '/xa-logo.png';
                      }}
                      onLoad={() => {
                        console.log('Logo preview loaded successfully');
                      }}
                    />
                  ) : (
                    <img 
                      src="/xa-logo.png" 
                      alt="Chi Alpha Logo" 
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        console.error('Error loading default logo');
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                {/* Text Preview */}
                <div 
                  className="flex-grow"
                  style={{ color: textColor }}
                  dangerouslySetInnerHTML={{ __html: editor?.getHTML() || 'Chi Alpha Campus Ministries' }}
                />

                {/* Buttons Preview */}
                <div className="flex-shrink-0 flex items-center gap-3 ml-4">
                  <div className={`px-3 py-1.5 rounded text-sm ${isLightBackground ? 'bg-gray-100 text-black' : 'bg-white/90 text-black'}`}>
                    More Info
                  </div>
                  <div className="px-3 py-1.5 rounded text-sm bg-gray-800 text-white">
                    Login
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logo Section */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Logo</label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <img 
                    src="/xa-logo.png" 
                    alt="Chi Alpha Logo" 
                    className="h-12 w-12 object-contain"
                  />
                )}
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
                <p className="text-xs text-gray-500 mt-1">Recommended: Square image, PNG or SVG</p>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>

          {/* Background Color Section */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Background Color</label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBgColor(color.value)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    bgColor === color.value ? 'border-blue-500 scale-110' : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <label className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="sr-only"
                />
                <span className="text-xs text-gray-500">+</span>
              </label>
            </div>
          </div>

          {/* Text Editor Section */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Header Text</label>
            
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 p-2 bg-gray-100 rounded-t-lg border border-b-0 border-gray-200">
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor?.isActive('bold') ? 'bg-gray-300' : ''}`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor?.isActive('italic') ? 'bg-gray-300' : ''}`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor?.isActive('underline') ? 'bg-gray-300' : ''}`}
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Font Family Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-2 py-1.5 rounded hover:bg-gray-200 flex items-center gap-1 text-sm">
                    <Type className="w-4 h-4" />
                    Font
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {fontFamilies.map((font) => (
                    <DropdownMenuItem
                      key={font.value}
                      onClick={() => {
                        editor?.chain().focus().setFontFamily(font.value).run();
                        setCurrentFontFamily(font.value);
                      }}
                      style={{ fontFamily: font.value }}
                    >
                      {font.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Font Size Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-2 py-1.5 rounded hover:bg-gray-200 flex items-center gap-1 text-sm">
                    Size
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {fontSizes.map((size) => (
                    <DropdownMenuItem
                      key={size.value}
                      onClick={() => {
                        // Apply font size by wrapping in span with style
                        const content = editor?.getHTML() || '';
                        const text = editor?.getText() || '';
                        editor?.commands.setContent(`<p style="font-size: ${size.value}; color: ${textColor};">${text}</p>`);
                        setCurrentFontSize(size.value);
                      }}
                      style={{ fontSize: size.value }}
                    >
                      {size.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Text Color */}
              <label className="px-2 py-1.5 rounded hover:bg-gray-200 flex items-center gap-1 text-sm cursor-pointer">
                <div 
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: textColor }}
                />
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="sr-only"
                />
                Text Color
              </label>
            </div>

            {/* Editor Content */}
            <div className="border border-gray-200 rounded-b-lg bg-white min-h-[80px]">
              <EditorContent 
                editor={editor} 
                className="[&_.ProseMirror]:p-3 [&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
