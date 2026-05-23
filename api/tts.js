const splitTextIntoChunks = (text, maxLength = 180) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (cleanText.length <= maxLength) return [cleanText];

    const chunks = [];
    let currentChunk = "";

    // Split by punctuation
    const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [cleanText];

    for (let sentence of sentences) {
        sentence = sentence.trim();
        if (!sentence) continue;

        if (currentChunk.length + sentence.length + 1 <= maxLength) {
            currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = "";
            }

            if (sentence.length > maxLength) {
                const words = sentence.split(' ');
                let subChunk = "";
                for (const word of words) {
                    if (subChunk.length + word.length + 1 <= maxLength) {
                        subChunk = subChunk ? `${subChunk} ${word}` : word;
                    } else {
                        if (subChunk) chunks.push(subChunk);
                        subChunk = word;
                    }
                }
                if (subChunk) currentChunk = subChunk;
            } else {
                currentChunk = sentence;
            }
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
};

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        let text = '';
        let speed = '1.0';

        if (req.method === 'POST') {
            // For Vercel, req.body might be parsed automatically if content-type is json
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            text = body?.text || '';
            speed = body?.speed || '1.0';
        } else {
            text = req.query.text || '';
            speed = req.query.speed || '1.0';
        }

        if (!text) {
            return res.status(400).json({ error: 'El parámetro de texto es obligatorio.' });
        }

        const chunks = splitTextIntoChunks(text);
        const buffers = [];

        for (const chunk of chunks) {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es-AR&client=tw-ob&q=${encodeURIComponent(chunk)}&ttsspeed=${speed === '1.0' ? '1' : '0.8'}`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`Error al obtener fragmento TTS. Status: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            buffers.push(Buffer.from(arrayBuffer));
        }

        const finalBuffer = Buffer.concat(buffers);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'attachment; filename="preparacion-teorica.mp3"');
        res.status(200).send(finalBuffer);

    } catch (error) {
        console.error('Error en TTS:', error);
        res.status(500).json({ error: error.message || 'Error Interno del Servidor' });
    }
}
