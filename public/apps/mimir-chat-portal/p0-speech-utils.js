/* Pure local formatting for speech. Never inserts model HTML into the page. */
(function (w) {
  'use strict';
  function pairedMarkup(value) {
    // A tag is markup only when it has a matching close. This preserves a<p>b.
    const blocks = new Set(['p', 'div', 'li', 'ul', 'ol', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    const pairs = /<(p|div|li|ul|ol|h[1-6]|blockquote|a|span|strong|em|b|i|u|small|code)(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*>([^]*?)<\/\1\s*>/gi;
    let result = value;
    for (let i = 0; i < 12; i++) {
      const next = result.replace(pairs, (_, tag, content) => blocks.has(tag.toLowerCase()) ? '\n' + content + '\n' : content);
      if (next === result) break;
      result = next;
    }
    return result;
  }
  function text(value) {
    // This is text for speech, NOT an HTML sanitizer. Never feed it to innerHTML.
    // In particular, <...> can be a comparison, generic type or placeholder.
    // Strip only known markup; preserve unknown angle-bracket text and operators.
    const plain = String(value ?? '')
      .replace(/<!--[^]*?-->/g, '')
      .replace(/```[\s\S]*?```/g, '\nKodeblokk står i chatten.\n')
      .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<pre\b[^>]*>[\s\S]*?<\/pre\s*>/gi, '\nKodeblokk står i chatten.\n')
      .replace(/<table\b[^>]*>[\s\S]*?<\/table\s*>/gi, '\nTabellen står i chatten.\n')
      .replace(/<sup\b[^>]*>([^<]*)<\/sup\s*>/gi, '^$1')
      .replace(/<sub\b[^>]*>([^<]*)<\/sub\s*>/gi, '_$1')
      .replace(/<(?:br|hr|wbr)\b[^<>]*\/?\s*>/gi, '\n')
      .replace(/<img\b[^<>]*\/?\s*>/gi, ' Bilde står i chatten. ');
    return pairedMarkup(plain)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' Bilde: $1. ')
      .replace(/\[([^\]]+)\]\(https?:\/\/[^)]*\)/g, '$1 (lenke i chatten)')
      .replace(/https?:\/\/\S+/g, 'lenke i chatten')
      .replace(/^\s*\|.*\|\s*$/gm, 'Tabellrad står i chatten.')
      .replace(/(?:Tabellrad står i chatten\.\s*)+/g, 'Tabellen står i chatten.\n')
      .replace(/^ {0,3}#{1,6} +/gm, '')
      // Do not erase signs in "- 5 °C" or operators in "2 * 3 * 4".
      .replace(/^ {0,3}[-*+] +(?=[^\d\s])/gm, '')
      .replace(/(^|[\s(])(\*\*|__)(\S(?:[^\n]*?\S)?)\2(?=$|[\s).,!?:;])/g, '$1$3')
      .replace(/(^|[\s(])([*_])(\S(?:[^\n]*?\S)?)\2(?=$|[\s).,!?:;])/g, '$1$3')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39|#(?:x[0-9a-f]+|[0-9]+));/gi, entity => {
        const key = entity.slice(1, -1).toLowerCase();
        const named = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
        if (Object.hasOwn(named, key)) return named[key];
        const code = key[1] === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
        return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;
      })
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
      if (/\b(?:f\.eks|bl\.a|dvs|ca|dr|nr|kl|kr)\.$/i.test(candidate.trim())) continue;
      // Do not read an incomplete code fence or markdown link.
      if ((candidate.match(/```/g) || []).length % 2 || /\[[^\]]*$/.test(candidate)) continue;
      // Never read a fragment from inside a not-yet-complete hidden/code/table block.
      if (['script', 'style', 'template', 'pre', 'table'].some(tag => {
        const opens = candidate.match(new RegExp('<' + tag + '\\b[^>]*>', 'gi')) || [];
        const closes = candidate.match(new RegExp('</' + tag + '\\s*>', 'gi')) || [];
        return opens.length > closes.length;
      })) continue;
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
