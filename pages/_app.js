import "../styles/globals.css";
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Unions Africa Bank</title>
        <meta
          name="description"
          content="Unions Africa Bank — modern, secure banking across Africa with live foreign exchange rates."
        />
        <link rel="icon" href="data:," />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
