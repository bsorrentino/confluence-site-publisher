/// <reference types="./marked" />

import { marked as MD } from 'marked'

type Blockquote = MD.Tokens.Blockquote

const decreaseQuoteLevel = (l:string) => {
    const r = /(\s*>)(.*)/g.exec(l)
    return (r) ? r[2] : l
}

const mytokenizer = { 

    blockquote: (src: string):Blockquote|boolean => {

        const pattern = />\s+[*][*]([Ww]arning|[Nn]ote|[Ii]nfo|[Tt]ip)[:][*][*]\s*(.*)$/

        const lines = src.split('\n')
        
        const rxResult = pattern.exec(lines[0])
        if( rxResult ) {

            lines[0] = `{${rxResult[1]}|title=${rxResult[2]}}`         
            
            const text = lines.map( decreaseQuoteLevel ).join('\n')
            
            return {
                type: 'blockquote',
                raw: src,
                text: text,
                tokens:  MD.lexer( text )
                
            } 
        }

        return false
    }

}

MD.use( {
    tokenizer: <any>mytokenizer
})

export class WikiRenderer implements MD.Renderer {
    
    constructor( public options:MD.MarkedOptions ) {} 

    langs = {
        'actionscript3' :true,
        'bash'          :true,
        'csharp'        :true,
        'coldfusion'    :true, 
        'cpp'           :true, 
        'css'           :true, 
        'delphi'        :true, 
        'diff'          :true,
        'erlang'        :true,
        'groovy'        :true,
        'java'          :true,
        'javafx'        :true,
        'javascript'    :true,
        'perl'          :true,
        'php'           :true,
        'none'          :true,
        'powershell'    :true,
        'python'        :true,
        'ruby'          :true,
        'scala'         :true,
        'sql'           :true,
        'vb'            :true,
        'html'          :true,
        'xml'           :true
    };

    checkbox(checked: boolean): string {
        return ''
    }

	paragraph(text:string) { return text + '\n\n'; }
	
    html(html:string) { return html; }

	heading(text:string, level:number, raw:string) { return 'h' + level + '. ' + text + '\n\n' }

	strong(text:string) { return '*' + text + '*' }

	em(text:string) { return '_' + text + '_' }

	del(text:string) { return '-' + text + '-' }

	codespan(text:string) { return `{{${text}}}` }

	blockquote(quote:string) { 
        const r = /^{([Ww]arning|[Nn]ote|[Ii]nfo|[Tt]ip)(.+)}(.*)/s.exec( quote );

        return ( r ) 
            ? `{${r[1]}${r[2]}}\n${r[3]}\n{${r[1]}}` 
            : `{quote}${quote}{quote}\n` 
    }

	br() { return '\n' }

	hr() { return '----\n' }

	link(href:string, title:string, text:string) {
		let arr = [text,href];
		if (title) arr.push(title);
		
		return '[' + arr.join('|') + ']'
	}

	list(body:string, ordered:boolean) {
        let arr = body.trim().split('\n').filter( (line) => line );

		var type = ordered ? '#' : '*'
        return arr.map( (line) => type + ' ' + line ).join('\n') + '\n\n'

	}

	listitem(body:string /*, ordered*/) { return body + '\n' }

	image(href:string, title:string, text:string) { return '!' + href + '!'}

	table(header:string, body:string) { 
        return `${header}${body}\n`;
    }

	tablerow(content:string ) { 
        const isHeader = content.startsWith('||');
        return content + (isHeader ? '||' : '|') + '\n';
    }

	tablecell(content:string, flags:any) {

		var type = flags.header ? '||' : '|'
		return type + content;
	}

	code(code:string, lang:string) {
		lang = (<any>this.langs)[lang] ? lang :  "";

		return `{code:${lang}}\n${code}\n{code}\n\n`;
	}

    text(text: string): string { return text; }
}

const  renderer = new WikiRenderer({})


/**
 * 
 * @param md markdown content as string
 * @param sanitize Sanitize the output. Ignore any HTML that has been input.
 */
export function markdown2wiki( md:string|Buffer, sanitize=true) {
    return MD.parse(md.toString(), {
        renderer: renderer
        //,sanitize:sanitize // deprecated
    });
}



