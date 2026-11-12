import Header from "../components/header";
import Footer from "../components/footer";

export default function ThankYou() {
  return (
    <>
      <Header />
      <main className="band thanks">
        <div className="wrap narrow">
          <h1>We have your project</h1>
          <p>Thank you for trusting us. A confirmation is on its way to your email, and we will get back to you as soon as possible.</p>
          <a className="btn" href="/">Back to home</a>
        </div>
      </main>
      <Footer />
    </>
  );
}
