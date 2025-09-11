import { useEffect, useState } from "react";
function Main2page() {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = process.env.REACT_APP_HOST
    console.log(host)
    setLoading(true);
    setError(null);
    fetch(`${host}/wikiPage/Main_Page`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch Wikipedia main page");
        return res.text();
      })
      .then((val: string) => {
        // Replace Wikipedia logo URLs
    

        setHtml(val);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center mt-10">Loading Wikipedia main page...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <>
      {/* Render your custom SearchBar above the Wikipedia content */}
      <div
        id="wiki-mainpage"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ minHeight: "100vh", background: "#f8f9fa", fontSize: 1.2 + 'rem' }}
      />
    </>
  );
}

export default Main2page;