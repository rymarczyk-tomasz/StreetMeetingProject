import { useEffect } from "react";

const useMetaTags = ({
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogUrl,
    canonical,
}) => {
    useEffect(() => {
        if (title) document.title = title;

        if (description) {
            const metaDescription = document.querySelector(
                'meta[name="description"]'
            );
            if (metaDescription)
                metaDescription.setAttribute("content", description);
        }

        if (keywords) {
            const metaKeywords = document.querySelector(
                'meta[name="keywords"]'
            );
            if (metaKeywords) metaKeywords.setAttribute("content", keywords);
        }

        if (ogTitle) {
            const ogTitleTag = document.querySelector(
                'meta[property="og:title"]'
            );
            if (ogTitleTag) ogTitleTag.setAttribute("content", ogTitle);
        }

        if (ogDescription) {
            const ogDescriptionTag = document.querySelector(
                'meta[property="og:description"]'
            );
            if (ogDescriptionTag)
                ogDescriptionTag.setAttribute("content", ogDescription);
        }

        if (ogUrl) {
            const ogUrlTag = document.querySelector('meta[property="og:url"]');
            if (ogUrlTag) ogUrlTag.setAttribute("content", ogUrl);
        }

        if (canonical) {
            const canonicalTag = document.querySelector(
                'link[rel="canonical"]'
            );
            if (canonicalTag) canonicalTag.setAttribute("href", canonical);
        }
    }, [
        title,
        description,
        keywords,
        ogTitle,
        ogDescription,
        ogUrl,
        canonical,
    ]);
};

export default useMetaTags;
