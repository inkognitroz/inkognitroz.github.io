(function(){
  const version='20260714-safe-markdown-v1';

  function safeText(value){
    return String(value||'').replace(/[&<>"']/g,(char)=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[char]));
  }

  function safeAttr(value){
    return safeText(value);
  }

  function safeUrl(value){
    try{
      const url=new URL(String(value||''));
      return (url.protocol==='https:'||url.protocol==='http:')?url.toString():'';
    }catch(_error){
      return '';
    }
  }

  function inline(text){
    const source=String(text||'');
    const token=/(`[^`\n]+`)|(!?\[[^\]\n]+\]\([^\s)]+\))|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;
    let html='';
    let index=0;
    let match;
    while((match=token.exec(source))!==null){
      html+=safeText(source.slice(index,match.index));
      const value=match[0];
      if(value.startsWith('`')){
        html+='<code>'+safeText(value.slice(1,-1))+'</code>';
      }else if(value.startsWith('![')){
        html+=safeText(value);
      }else if(value.startsWith('[')){
        const link=value.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        const url=safeUrl(link?.[2]);
        html+=url?'<a href="'+safeAttr(url)+'" target="_blank" rel="noopener noreferrer">'+safeText(link[1])+'</a>':safeText(value);
      }else if(value.startsWith('**')||value.startsWith('__')){
        html+='<strong>'+safeText(value.slice(2,-2))+'</strong>';
      }else{
        html+='<em>'+safeText(value.slice(1,-1))+'</em>';
      }
      index=token.lastIndex;
    }
    return html+safeText(source.slice(index));
  }

  function tableCells(line){
    return String(line||'').trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());
  }

  function markdown(text){
    const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n');
    const out=[];
    let index=0;
    const isList=(line)=>/^\s*(?:[-*+] |\d+[.)] )/.test(line);
    const isTableDivider=(line)=>/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
    const isBlockStart=(line,next)=>/^\s*```/.test(line)||/^\s{0,3}#{1,4}\s+/.test(line)||/^\s*>\s?/.test(line)||isList(line)||(line.includes('|')&&isTableDivider(next||''));

    while(index<lines.length){
      const line=lines[index];
      if(!line.trim()){index++;continue;}

      const fence=line.match(/^\s*```([^`]*)$/);
      if(fence){
        const code=[];
        index++;
        while(index<lines.length&&!/^\s*```\s*$/.test(lines[index]))code.push(lines[index++]);
        if(index<lines.length)index++;
        out.push('<pre><code data-language="'+safeAttr(fence[1].trim())+'">'+safeText(code.join('\n'))+'</code></pre>');
        continue;
      }

      const heading=line.match(/^\s{0,3}(#{1,4})\s+(.+)$/);
      if(heading){out.push('<h'+Math.min(4,heading[1].length+2)+'>'+inline(heading[2])+'</h'+Math.min(4,heading[1].length+2)+'>');index++;continue;}

      if(line.includes('|')&&isTableDivider(lines[index+1]||'')){
        const headers=tableCells(line);
        const rows=[];
        index+=2;
        while(index<lines.length&&lines[index].includes('|')&&lines[index].trim())rows.push(tableCells(lines[index++]));
        out.push('<div class="message-table-scroll"><table><thead><tr>'+headers.map(cell=>'<th>'+inline(cell)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+headers.map((_,cellIndex)=>'<td>'+inline(row[cellIndex]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');
        continue;
      }

      if(isList(line)){
        const ordered=/^\s*\d+[.)] /.test(line);
        const items=[];
        while(index<lines.length&&isList(lines[index])===true&&(/^\s*\d+[.)] /.test(lines[index]))===ordered){
          items.push(lines[index++].replace(/^\s*(?:[-*+] |\d+[.)] )/,'').trim());
        }
        const tag=ordered?'ol':'ul';
        out.push('<'+tag+'>'+items.map(item=>'<li>'+inline(item)+'</li>').join('')+'</'+tag+'>');
        continue;
      }

      if(/^\s*>\s?/.test(line)){
        const quote=[];
        while(index<lines.length&&/^\s*>\s?/.test(lines[index]))quote.push(lines[index++].replace(/^\s*>\s?/,''));
        out.push('<blockquote>'+quote.map(inline).join('<br>')+'</blockquote>');
        continue;
      }

      const paragraph=[];
      while(index<lines.length&&lines[index].trim()&&!isBlockStart(lines[index],lines[index+1]))paragraph.push(lines[index++].trim());
      if(!paragraph.length){paragraph.push(lines[index++].trim());}
      out.push('<p>'+paragraph.map(inline).join('<br>')+'</p>');
    }
    return out.join('')||'<p></p>';
  }

  function paragraphs(text){
    return markdown(text);
  }

  function formatDuration(ms){
    const value=Math.max(0,Number(ms)||0);
    if(value<1000)return Math.round(value)+'ms';
    return (value/1000).toFixed(value<10000?1:0)+'s';
  }

  window.MimirP0Text={
    version,
    safeText,
    safeAttr,
    markdown,
    paragraphs,
    formatDuration
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-text-ready',{detail:{version}}));
})();
