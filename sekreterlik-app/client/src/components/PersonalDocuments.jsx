import React, { useState, useEffect } from 'react';
import ApiService from '../utils/ApiService';
import { useAuth } from '../contexts/AuthContext';

const PersonalDocuments = ({ memberId }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [error, setError] = useState('');

  // Check if user is admin or viewing their own documents
  const isAdmin = user && user.role === 'admin';
  const isOwnDocuments = user && user.role === 'member' && user.memberId === parseInt(memberId);
  const canViewDocuments = isAdmin || isOwnDocuments;

  useEffect(() => {
    if (canViewDocuments) {
      fetchDocuments();
    }
  }, [memberId, canViewDocuments]);

  const fetchDocuments = async () => {
    try {
      const data = await ApiService.getPersonalDocuments(memberId);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Belgeler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Sadece PDF dosyaları yüklenebilir');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Dosya boyutu 10MB\'dan küçük olmalıdır');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim()) {
      setError('Lütfen dosya seçin ve belge adı girin');
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      const result = await ApiService.uploadPersonalDocument(memberId, documentName.trim(), selectedFile);
      
      // Başarı mesajı göster
      if (result && result.message) {
        // Refresh documents list
        await fetchDocuments();
        
        // Reset form
        setSelectedFile(null);
        setDocumentName('');
        setShowUploadForm(false);
        setError(''); // Hata mesajını temizle
        
        // Başarı mesajı (opsiyonel - kullanıcı belgeler listesinde görecek)
        console.log('Belge başarıyla yüklendi:', result.message);
      } else {
        throw new Error('Belge yüklenirken beklenmeyen bir hata oluştu');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Belge yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId, documentName) => {
    try {
      const blob = await ApiService.downloadPersonalDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await ApiService.deletePersonalDocument(documentId);
      await fetchDocuments();
    } catch (error) {
      setError(error.message);
    }
  };


  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (!canViewDocuments) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Belgeler yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Kişisel Belgeler</h3>
        {(isAdmin || isOwnDocuments) && documents.length < 5 && (
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Belge Ekle
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {showUploadForm && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Yeni Belge Yükle</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Belge Adı
              </label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Belge adını yazın (örn: Kimlik, Diploma, Sertifika)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PDF Dosyası
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Sadece PDF dosyaları kabul edilir. Maksimum dosya boyutu: 10MB
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Seçilen dosya:</strong> {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  Boyut: {formatFileSize(selectedFile.size)}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowUploadForm(false);
                  setSelectedFile(null);
                  setDocumentName('');
                  setError('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                disabled={uploading}
              >
                İptal
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !documentName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-200 flex items-center disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Yükleniyor...
                  </>
                ) : (
                  'Yükle'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz belge yüklenmemiş</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bu üye için henüz hiç belge yüklenmemiş.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {document.document_name || document.document_type_label || 'Belge'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(document.file_size)} • {formatDate(document.uploaded_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(document.id, document.document_name)}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors duration-200"
                  title="İndir"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(document.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                    title="Sil"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          {documents.length}/5 belge yüklenmiş
        </div>
      )}
    </div>
  );
};

export default PersonalDocuments;
