import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

interface Props {
  content: string;
}

export function LatexRenderer({ content }: Props) {
  // Check if content contains a table syntax to conditionally add the scroll styling wrapper
  // this prevents redundant vertical spacing or layouts for simple tiny text formulas.
  const hasTable = content.includes('|') || content.includes('</table>') || content.includes('</td>');

  const mdRenderer = (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div className="text-inherit styled-markdown">
      {hasTable ? (
        <div className="styled-markdown-container">
          <div className="min-w-full p-0.5">
            {mdRenderer}
          </div>
        </div>
      ) : (
        mdRenderer
      )}
    </div>
  );
}
