// Type definitions for Marked 0.7
// Project: https://github.com/markedjs/marked, https://marked.js.org
// Definitions by: William Orr <https://github.com/worr>
//                 BendingBender <https://github.com/BendingBender>
//                 CrossR <https://github.com/CrossR>
//                 Mike Wickett <https://github.com/mwickett>
//                 Hitomi Hatsukaze <https://github.com/htkzhtm>
//                 Ezra Celli <https://github.com/ezracelli>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

import { Tokenizer, Token, Renderer} from "marked";

declare namespace marked {
    type CustomTokenizer = { [name in keyof Tokenizer]:Token|boolean }
    type CustomRenderer = { [name in keyof Renderer]:string|boolean }
    type WalkTokenFunction = (token:Token) => void

    export interface Extensions {
        renderer?:CustomRenderer
        tokenizer?:CustomTokenizer
        walkTokens?:WalkTokenFunction
    }
}
 