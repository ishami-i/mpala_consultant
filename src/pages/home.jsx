import Header from "../components/header";
import Footer from "../components/footer";
import AboutCompany from "../components/aboutCompany";
import Services from "../components/services";
import Experience from "../components/experiences";
import GetInTouch from "../components/getIntouch";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="wrap">
            <h1>Land, design and construction, from a team with over 20 years behind it.</h1>
            <p>Tell us about your plot, your plan and your budget. Our team reviews every project and replies personally.</p>
            <a className="btn" href="#contact">Submit your project</a>
          </div>
        </section>
        <AboutCompany />
        <Services />
        <Experience />
        <GetInTouch />
      </main>
      <Footer />
    </>
  );
}
