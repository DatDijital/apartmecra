/**
 * Groq API Service
 * Ücretsiz ve hızlı AI chat completions için Groq API kullanır
 */

class GroqService {
  static API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  
  /**
   * Groq API ile chat completion
   * @param {string} userMessage - Kullanıcı mesajı
   * @param {Array} context - Site verileri ve tüzük bilgileri context'i
   * @param {Array} conversationHistory - Konuşma geçmişi
   * @returns {Promise<string>} AI yanıtı
   */
  static async chat(userMessage, context = [], conversationHistory = []) {
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      
      if (!apiKey) {
        throw new Error('Groq API key bulunamadı. Lütfen VITE_GROQ_API_KEY environment variable\'ını ayarlayın.');
      }

      // System prompt - AI'nın kimliği ve sınırları
      const systemPrompt = `Sen "Yeniden Refah Partisi Elazığ Merkez İlçe Sekreteri" adlı bir yapay zeka asistanısın. Görevin site içi bilgileri ve yüklenen siyasi parti tüzüğünü kullanarak kullanıcılara yardımcı olmaktır.

KURALLAR:
1. SADECE verilen bilgileri (context) kullanarak cevap ver
2. Site içi bilgiler (üyeler, etkinlikler, toplantılar, bölgeler vb.) ve tüzük bilgileri dışında bilgi verme
3. Eğer sorulan bilgi context'te yoksa, "Bu bilgiyi bulamadım. Lütfen site içi bilgiler veya tüzük ile ilgili sorular sorun." de
4. Eğer tüzük için web linki verilmişse, kullanıcıya tüzük hakkında sorular sorduğunda bu linki paylaşabilirsin: "Parti tüzüğü hakkında detaylı bilgi için şu linki ziyaret edebilirsiniz: [link]"
5. Hassas bilgileri (TC, telefon, adres vb.) sadece yetkili kullanıcılar sorduğunda paylaş
6. Türkçe yanıt ver, samimi ve yardımcı ol
7. Yanıtlarını kısa ve öz tut, gereksiz detay verme
8. Sayısal sorular için (kaç üye var, kaç etkinlik yapıldı vb.) context'teki verileri kullanarak hesapla

CONTEXT BİLGİLERİ:
${context.length > 0 ? context.map((item, index) => `${index + 1}. ${item}`).join('\n') : 'Henüz context bilgisi yok.'}`;

      // Konuşma geçmişini formatla
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', // Güncel model - hızlı ve ücretsiz
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Groq API hatası: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Groq API yanıt formatı beklenmedik');
      }
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }

  /**
   * Site verilerini context'e çevir
   * @param {Object} siteData - Firestore'dan çekilen site verileri
   * @returns {Array<string>} Context array'i
   */
  static buildSiteContext(siteData) {
    const context = [];
    
    // ÜYE BİLGİLERİ
    if (siteData.members && siteData.members.length > 0) {
      context.push(`\n=== ÜYE BİLGİLERİ ===`);
      context.push(`Toplam ${siteData.members.length} üye kayıtlı.`);
      
      // Tüm üyelerin detaylı bilgileri
      const membersList = siteData.members.map(m => {
        const info = [];
        info.push(`Ad Soyad: ${m.name || 'İsimsiz'}`);
        if (m.tc) info.push(`TC: ${m.tc}`);
        if (m.phone) info.push(`Telefon: ${m.phone}`);
        if (m.region) info.push(`Bölge: ${m.region}`);
        if (m.position) info.push(`Görev: ${m.position}`);
        if (m.address) info.push(`Adres: ${m.address}`);
        return info.join(', ');
      }).join('\n');
      
      context.push(`ÜYE LİSTESİ:\n${membersList}`);
    }
    
    // TOPLANTI BİLGİLERİ
    if (siteData.meetings && siteData.meetings.length > 0) {
      const activeMeetings = siteData.meetings.filter(m => !m.archived);
      context.push(`\n=== TOPLANTI BİLGİLERİ ===`);
      context.push(`Toplam ${activeMeetings.length} aktif toplantı var.`);
      
      // Her toplantının detayları
      activeMeetings.forEach(meeting => {
        const meetingInfo = [];
        meetingInfo.push(`Toplantı: ${meeting.name || 'İsimsiz toplantı'}`);
        if (meeting.date) meetingInfo.push(`Tarih: ${meeting.date}`);
        if (meeting.location) meetingInfo.push(`Yer: ${meeting.location}`);
        
        // Yoklama bilgileri
        if (meeting.attendees && meeting.attendees.length > 0) {
          const attended = meeting.attendees.filter(a => a.attended === true).length;
          const notAttended = meeting.attendees.length - attended;
          meetingInfo.push(`Katılan: ${attended}, Katılmayan: ${notAttended}`);
          
          // Katılmayanların listesi
          if (notAttended > 0) {
            const notAttendedMembers = meeting.attendees
              .filter(a => a.attended !== true)
              .map(a => {
                const member = siteData.members?.find(m => String(m.id) === String(a.memberId));
                return member ? member.name : 'Bilinmeyen üye';
              })
              .join(', ');
            meetingInfo.push(`Katılmayanlar: ${notAttendedMembers}`);
          }
        }
        
        context.push(meetingInfo.join(' | '));
      });
    }
    
    // ETKİNLİK BİLGİLERİ
    if (siteData.events && siteData.events.length > 0) {
      const activeEvents = siteData.events.filter(e => !e.archived);
      context.push(`\n=== ETKİNLİK BİLGİLERİ ===`);
      context.push(`Toplam ${activeEvents.length} aktif etkinlik var.`);
      
      activeEvents.forEach(event => {
        const eventInfo = [];
        eventInfo.push(`Etkinlik: ${event.name || 'İsimsiz etkinlik'}`);
        if (event.date) eventInfo.push(`Tarih: ${event.date}`);
        if (event.location) eventInfo.push(`Yer: ${event.location}`);
        
        if (event.attendees && event.attendees.length > 0) {
          const attended = event.attendees.filter(a => a.attended === true).length;
          eventInfo.push(`Katılan: ${attended}`);
        }
        
        context.push(eventInfo.join(' | '));
      });
    }
    
    // DİĞER BİLGİLER
    if (siteData.districts && siteData.districts.length > 0) {
      context.push(`\n=== İLÇE BİLGİLERİ ===`);
      context.push(`${siteData.districts.length} ilçe kayıtlı: ${siteData.districts.map(d => d.name).join(', ')}`);
    }
    
    if (siteData.towns && siteData.towns.length > 0) {
      context.push(`\n=== BELDE BİLGİLERİ ===`);
      context.push(`${siteData.towns.length} belde kayıtlı: ${siteData.towns.map(t => t.name).join(', ')}`);
    }
    
    if (siteData.neighborhoods && siteData.neighborhoods.length > 0) {
      context.push(`\n=== MAHALLE BİLGİLERİ ===`);
      context.push(`${siteData.neighborhoods.length} mahalle kayıtlı.`);
    }
    
    if (siteData.villages && siteData.villages.length > 0) {
      context.push(`\n=== KÖY BİLGİLERİ ===`);
      context.push(`${siteData.villages.length} köy kayıtlı.`);
    }
    
    // ÜYE KAYIT BİLGİSİ
    context.push(`\n=== ÜYE KAYIT İŞLEMİ ===`);
    context.push(`Üye kaydı için: Ayarlar > Üye Ekle veya Üyeler sayfasından yeni üye eklenebilir.`);
    context.push(`Üye kaydı için gerekli bilgiler: Ad Soyad, TC Kimlik No, Telefon, Adres, Bölge, Görev.`);
    
    return context;
  }

  /**
   * Üye bilgilerini context'e ekle (detaylı arama)
   * @param {Array} members - Üye listesi
   * @param {string} searchTerm - Arama terimi
   * @param {Array} meetings - Toplantı listesi (yoklama için)
   * @returns {Array<string>} Context array'i
   */
  static buildMemberContext(members, searchTerm = '', meetings = []) {
    const context = [];
    
    if (!searchTerm || !members || members.length === 0) {
      return context;
    }
    
    // Üye arama (isim, TC, telefon ile)
    const searchLower = searchTerm.toLowerCase();
    const matchingMembers = members.filter(m => {
      const nameMatch = m.name && m.name.toLowerCase().includes(searchLower);
      const tcMatch = m.tc && m.tc.toLowerCase().includes(searchLower);
      const phoneMatch = m.phone && m.phone.toLowerCase().includes(searchLower);
      return nameMatch || tcMatch || phoneMatch;
    });
    
    if (matchingMembers.length > 0) {
      matchingMembers.slice(0, 5).forEach(member => {
        const info = [];
        info.push(`Üye: ${member.name || 'İsimsiz'}`);
        if (member.tc) info.push(`TC: ${member.tc}`);
        if (member.phone) info.push(`Telefon: ${member.phone}`);
        if (member.region) info.push(`Bölge: ${member.region}`);
        if (member.position) info.push(`Görev: ${member.position}`);
        if (member.address) info.push(`Adres: ${member.address}`);
        
        // Toplantı yoklama bilgisi
        if (meetings && meetings.length > 0) {
          const memberId = String(member.id);
          const memberMeetings = meetings.filter(m => {
            if (!m.attendees) return false;
            return m.attendees.some(a => String(a.memberId) === memberId);
          });
          
          if (memberMeetings.length > 0) {
            const attended = memberMeetings.filter(m => {
              const attendee = m.attendees.find(a => String(a.memberId) === memberId);
              return attendee && attendee.attended === true;
            }).length;
            const notAttended = memberMeetings.length - attended;
            info.push(`Toplantı katılım: ${attended} toplantıya katıldı, ${notAttended} toplantıya katılmadı`);
            
            // Katılmadığı toplantılar
            if (notAttended > 0) {
              const notAttendedMeetings = memberMeetings
                .filter(m => {
                  const attendee = m.attendees.find(a => String(a.memberId) === memberId);
                  return !attendee || attendee.attended !== true;
                })
                .map(m => `${m.name || 'İsimsiz'} (${m.date || 'Tarih yok'})`)
                .slice(0, 5)
                .join(', ');
              info.push(`Katılmadığı toplantılar: ${notAttendedMeetings}`);
            }
          }
        }
        
        context.push(info.join(' | '));
      });
    }
    
    return context;
  }
}

export default GroqService;

