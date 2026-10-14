import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  RotateCcw,
  FileCode,
  CheckCircle2,
} from 'lucide-react';

export const EditorDemo: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'html' | 'json' | 'sdk'>('visual');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);

  const initialContent = `
    <h2>Welcome to API Section — Rich Text Editor Engine</h2>
    <p>This is a live interactive demonstration of the editor core. Try formatting text, adding lists, or inspecting serialized output in real time.</p>
    <blockquote>"Engineered for clean semantic markup, zero bundle bloat, and seamless single-domain web application integration."</blockquote>
    <ul>
      <li>Fast content editing with native browser selection APIs</li>
      <li>Clean HTML5 semantic sanitization</li>
      <li>Customizable toolbar actions and shortcuts</li>
    </ul>
  `.trim();

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
      updateStats(editorRef.current.innerHTML);
    }
  }, []);

  const updateStats = (html: string) => {
    setHtmlContent(html);
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    setCharCount(text.length);
    setWordCount(text ? text.split(/\s+/).length : 0);
  };

  const handleInput = () => {
    if (editorRef.current) {
      updateStats(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      updateStats(editorRef.current.innerHTML);
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter hyperlink URL:', 'https://');
    if (url && url !== 'https://') {
      executeCommand('createLink', url);
    }
  };

  const handleReset = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
      updateStats(initialContent);
    }
  };

  const jsonRepresentation = {
    schemaVersion: '1.0',
    timestamp: new Date().toISOString(),
    metrics: { words: wordCount, characters: charCount },
    content: htmlContent,
  };

  const sampleSdkSnippet = `// API Section Rich Text Editor SDK Example
import { createEditor } from '@api-section/rich-text-editor';

const editor = createEditor({
  target: '#my-editor-container',
  licenseKey: 'DIG-XXXX-XXXX-XXXX-XXXX', // Bound to your verified domain
  placeholder: 'Compose rich blog article...',
  onChange: (state) => {
    console.log('Document updated:', state.metrics);
  }
});`;

  return (
    <section className="demo-section" id="editor-demo">
      <div className="container">
        <div className="section-head">
          <span className="badge badge-brand" style={{ marginBottom: '0.75rem' }}>
            Live Interactive Preview
          </span>
          <h2 className="section-title">Experience the Editor SDK in Action</h2>
          <p className="section-subtitle">
            Test the real-time editing feel, format content directly in this playground, and inspect the clean serialized output.
          </p>
        </div>

        <div className="editor-wrapper">
          {/* Editor Header Bar */}
          <div className="editor-titlebar">
            <div className="editor-traffic-lights">
              <span className="traffic-light red"></span>
              <span className="traffic-light yellow"></span>
              <span className="traffic-light green"></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
              <FileCode size={14} />
              <span>API Section — Target Domain Verification Sandbox</span>
            </div>
            <div className="tabs-nav">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'visual' ? 'active' : ''}`}
                onClick={() => setActiveTab('visual')}
              >
                Visual Editor
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`}
                onClick={() => setActiveTab('html')}
              >
                HTML Output
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
                onClick={() => setActiveTab('json')}
              >
                JSON State
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'sdk' ? 'active' : ''}`}
                onClick={() => setActiveTab('sdk')}
              >
                SDK Code
              </button>
            </div>
          </div>

          {/* Visual Toolbar */}
          {activeTab === 'visual' && (
            <div className="editor-toolbar">
              <button
                type="button"
                className="toolbar-btn"
                title="Bold (Ctrl+B)"
                onClick={() => executeCommand('bold')}
              >
                <Bold size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Italic (Ctrl+I)"
                onClick={() => executeCommand('italic')}
              >
                <Italic size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Underline (Ctrl+U)"
                onClick={() => executeCommand('underline')}
              >
                <Underline size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Strikethrough"
                onClick={() => executeCommand('strikeThrough')}
              >
                <Strikethrough size={16} />
              </button>

              <div className="toolbar-divider" />

              <button
                type="button"
                className="toolbar-btn"
                title="Heading 1"
                onClick={() => executeCommand('formatBlock', 'h2')}
              >
                <Heading1 size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Heading 2"
                onClick={() => executeCommand('formatBlock', 'h3')}
              >
                <Heading2 size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Blockquote"
                onClick={() => executeCommand('formatBlock', 'blockquote')}
              >
                <Quote size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Bulleted List"
                onClick={() => executeCommand('insertUnorderedList')}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Numbered List"
                onClick={() => executeCommand('insertOrderedList')}
              >
                <ListOrdered size={16} />
              </button>

              <div className="toolbar-divider" />

              <button
                type="button"
                className="toolbar-btn"
                title="Insert Hyperlink"
                onClick={handleInsertLink}
              >
                <Link2 size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Reset Content"
                onClick={handleReset}
              >
                <RotateCcw size={16} />
              </button>
            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'visual' && (
            <div
              ref={editorRef}
              className="editor-content-area"
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
            />
          )}

          {activeTab === 'html' && (
            <div className="editor-raw-output">{htmlContent}</div>
          )}

          {activeTab === 'json' && (
            <div className="editor-raw-output">
              {JSON.stringify(jsonRepresentation, null, 2)}
            </div>
          )}

          {activeTab === 'sdk' && (
            <div className="editor-raw-output" style={{ color: '#a5b4fc' }}>
              {sampleSdkSnippet}
            </div>
          )}

          {/* Status Bar */}
          <div className="editor-statusbar">
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <span>Words: <strong style={{ color: '#f8fafc' }}>{wordCount}</strong></span>
              <span>Characters: <strong style={{ color: '#f8fafc' }}>{charCount}</strong></span>
              <span>Encoding: <strong style={{ color: '#f8fafc' }}>UTF-8 Clean HTML</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
              <CheckCircle2 size={14} />
              <span>Standard Browser Engine Ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
