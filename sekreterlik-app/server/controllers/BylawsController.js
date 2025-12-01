// Use built-in fetch (Node.js 18+) or node-fetch for older versions
// Try built-in fetch first, fallback to node-fetch if needed
let fetch;
try {
  // Node.js 18+ has built-in fetch
  if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
  } else {
    // Fallback for older Node.js versions
    fetch = require('node-fetch');
  }
} catch (error) {
  // If node-fetch is not available, we'll handle it in the function
  console.warn('Fetch not available, will install node-fetch if needed');
}

/**
 * Fetch bylaws text from URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchBylawsFromUrl = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL parametresi gerekli'
      });
    }

    // URL validation
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz URL formatı'
      });
    }

    // Fetch HTML from URL
    // Use built-in fetch if available, otherwise throw error
    if (!fetch) {
      throw new Error('Fetch fonksiyonu mevcut değil. Lütfen node-fetch package\'ını yükleyin veya Node.js 18+ kullanın.');
    }
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
    
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return res.status(408).json({
          success: false,
          message: 'İstek zaman aşımına uğradı (10 saniye)'
        });
      }
      throw error;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`
      });
    }

    const html = await response.text();

    // Extract text from HTML
    // Remove script and style tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    // Find the main content area (tüzük içeriği genellikle belirli bir div içinde)
    // Try to find content between specific markers
    const contentMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                        html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                        html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

    if (contentMatch) {
      // Extract text from content area
      let contentText = contentMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      // If content area has meaningful text, use it
      if (contentText.length > 500) {
        text = contentText;
      }
    }

    // Clean up the text
    const cleanedText = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    // Limit to reasonable size (50KB)
    const maxLength = 50000;
    const finalText = cleanedText.length > maxLength 
      ? cleanedText.substring(0, maxLength) + '... (devamı var)'
      : cleanedText;

    res.json({
      success: true,
      text: finalText,
      length: finalText.length,
      url: url
    });

  } catch (error) {
    console.error('Error fetching bylaws from URL:', error);
    res.status(500).json({
      success: false,
      message: 'URL\'den içerik çekilirken hata oluştu: ' + error.message
    });
  }
};

module.exports = {
  fetchBylawsFromUrl
};

