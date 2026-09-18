/* Pure local formatting for speech. Never inserts model HTML into the page. */
(function (w) {
  'use strict';
  function text(value) {
    return String(value || '')
      .replace(/```[\s\S]*?```/g, '\nKodeblokk står i chatten.\n')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, '\nKodeblokk står i chatten.\n')
      .replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, '\nTabellen står i chatten.\n')
      .replace(/<\/?(?:p|div|li|ul|ol|h[1-6]|br|blockquote)\b[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' Bilde: $1. ')
      .replace(/\[([^\]]+)\]\(https?:\/\/[^)]*\)/g, '$1 (lenke i chatten)')
      .replace(/https?:\/\/\S+/g, 'lenke i chatten')
      .replace(/^\s*\|.*\|\s*$/gm, 'Tabellrad står i chatten.')
      .replace(/(?:Tabellrad står i chatten\.\s*)+/g, 'Tabellen står i chatten.\n')
      .replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+|>\s*)/gm, '')
      .replace(/[*_`]/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function chunks(value, limit = 220) {
    const result = []; let rest = value.trim();
    while (rest) {
      if (rest.length <= limit) { result.push(rest); break; }
      let end = rest.lastIndexOf(' ', limit);
      if (end < limit / 3) end = limit;
      result.push(rest.slice(0, end).trim()); rest = rest.slice(end).trim();
    }
    return result;
  }
  // Leave a trailing fragment buffered; a period inside 3.14 is not a boundary.
  function sentences(buffer, flush = false) {
    const complete = []; let offset = 0;
    const re = /[.!?](?:[»”"')\]]*)(?=\s)|\n\n/g; let match;
    while ((match = re.exec(buffer))) {
      const end = match.index + match[0].length;
      const candidate = buffer.slice(offset, end);
      if (/\b(?:f\.eks|bl\.a|dvs|ca|dr|nr)\.$/i.test(candidate.trim())) continue;
      // Do not read an incomplete code fence or markdown link.
      if ((candidate.match(/```/g) || []).length % 2 || /\[[^\]]*$/.test(candidate)) continue;
      complete.push(candidate); offset = end;
    }
    if (flush && buffer.slice(offset).trim()) { complete.push(buffer.slice(offset)); offset = buffer.length; }
    return { complete, rest: buffer.slice(offset) };
  }
  const errors = Object.freeze({
    network: 'Nettverksfeil i talegjenkjenningen. Prøv opptaket igjen eller skriv spørsmålet; ingen melding er sendt.',
    'audio-capture': 'Mikrofonen er ikke tilgjengelig. Kontroller valgt mikrofon og lukk andre opptak.',
    'not-allowed': 'Mikrofontillatelse ble ikke gitt. Endre nettstedets mikrofontillatelse i nettleseren, eller skriv i chatten.',
    'service-not-allowed': 'Nettleseren tillater ikke denne talegjenkjenningen. Bruk tekst eller en støttet nettleser.',
    'language-not-supported': 'Norsk talegjenkjenning er ikke tilgjengelig her. Ingen ekstern reservetjeneste ble startet.',
    'no-speech': 'Ingen tale registrert. Trykk Snakk for et nytt opptak, eller skriv i chatten.',
    aborted: 'Opptaket er avbrutt. Ingen ny melding er sendt.'
  });
  w.MmirSpeechUtils = Object.freeze({ text, chunks, sentences, errors });
})(window);
