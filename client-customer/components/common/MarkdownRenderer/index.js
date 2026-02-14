import React from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './MarkdownRenderer.module.css';

const MarkdownRenderer = ({ content, className = '' }) => {
    if (!content) return null;

    const components = {
        // Custom heading components
        h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
        h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
        h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
        h4: ({ children }) => <h4 className={styles.h4}>{children}</h4>,
        h5: ({ children }) => <h5 className={styles.h5}>{children}</h5>,
        h6: ({ children }) => <h6 className={styles.h6}>{children}</h6>,
        
        // Custom paragraph component
        p: ({ children }) => <p className={styles.paragraph}>{children}</p>,
        
        // Custom list components
        ul: ({ children }) => <ul className={styles.unorderedList}>{children}</ul>,
        ol: ({ children }) => <ol className={styles.orderedList}>{children}</ol>,
        li: ({ children }) => <li className={styles.listItem}>{children}</li>,
        
        // Custom emphasis components
        strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
        em: ({ children }) => <em className={styles.emphasis}>{children}</em>,
        
        // Custom code components
        code: ({ inline, children }) => (
            inline 
                ? <code className={styles.inlineCode}>{children}</code>
                : <code className={styles.codeBlock}>{children}</code>
        ),
        pre: ({ children }) => <pre className={styles.preBlock}>{children}</pre>,
        
        // Custom blockquote
        blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
        
        // Custom link
        a: ({ href, children }) => (
            <a 
                href={href} 
                className={styles.link} 
                target="_blank" 
                rel="noopener noreferrer"
            >
                {children}
            </a>
        ),
        
        // Custom horizontal rule
        hr: () => <hr className={styles.horizontalRule} />,
        
        // Custom table components
        table: ({ children }) => <table className={styles.table}>{children}</table>,
        thead: ({ children }) => <thead className={styles.tableHead}>{children}</thead>,
        tbody: ({ children }) => <tbody className={styles.tableBody}>{children}</tbody>,
        tr: ({ children }) => <tr className={styles.tableRow}>{children}</tr>,
        th: ({ children }) => <th className={styles.tableHeader}>{children}</th>,
        td: ({ children }) => <td className={styles.tableCell}>{children}</td>,
        img: ({ src, alt }) => {
            if (src && src.startsWith('media://')) {
                const mediaId = src.replace('media://', '');
                return (
                    <img 
                        src={`http://localhost:4000/media/${mediaId}`} 
                        alt={alt} 
                        className={styles.image} 
                    />
                );
            }
            return <img src={src} alt={alt} className={styles.image} />;
        },
    };

    return (
        <div className={`${styles.markdownRenderer} ${className}`}>
            <ReactMarkdown components={components}>
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer; 