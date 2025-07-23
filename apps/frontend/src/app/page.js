import Hero from "@/components/hero"
import HowItWorks from "@/components/how-it-works"
import WhyGenuineGrads from "@/components/why-genuinegrads"
import ForUniversities from "@/components/for-universities"
import ForStudents from "@/components/for-students"
import ForEmployers from "@/components/for-employers"
import CTASection from "@/components/cta-section"

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhyGenuineGrads />
      <ForUniversities />
      <ForStudents />
      <ForEmployers />
      <CTASection />
    </>
  )
}
