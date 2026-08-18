"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Phone } from "lucide-react"
import { MarketingHero } from "@/components/marketing-hero"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    category: "general",
  })

  const [formSubmitted, setFormSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would normally send the form data to your backend
    console.log("Form submitted:", formData)
    setFormSubmitted(true)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MarketingHero
        kicker="Contact"
        title="Get in touch"
        description="Reach our team for inquiries, partnership opportunities, or support."
      />

      <div className="container mx-auto px-4 py-14 md:px-6">
      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-7">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#E1BAC2]/10">
            <Phone className="h-5 w-5 text-[#E1BAC2]" />
          </div>
          <h3 className="font-display text-lg font-bold text-[#171414]">Phone</h3>
          <p className="mt-1 text-[#4A4A4A]">+234 901 234 5678</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[#4A4A4A]">
            Monday to Friday, 9AM to 6PM
          </p>
        </div>

        <div className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-7">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#E1BAC2]/10">
            <Mail className="h-5 w-5 text-[#E1BAC2]" />
          </div>
          <h3 className="font-display text-lg font-bold text-[#171414]">Email</h3>
          <p className="mt-1 text-[#4A4A4A]">
            <a href="mailto:frank@unitedalliedbusiness.com">frank@unitedalliedbusiness.com</a>
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[#4A4A4A]">
            We&apos;ll respond as soon as possible
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 p-8">
          <h2 className="mb-6 font-display text-2xl font-extrabold tracking-tight text-[#171414]">Send Us a Message</h2>
          {formSubmitted ? (
            <div className="border border-accent/40 bg-accent/5 p-6">
              <h3 className="mb-2 font-display text-xl font-medium">Thank You!</h3>
              <p className="mb-4 text-muted-foreground">
                Your message has been successfully submitted. Our team will get back to you shortly.
              </p>
              <Button
                onClick={() => {
                  setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    subject: "",
                    message: "",
                    category: "general",
                  })
                  setFormSubmitted(false)
                }}
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Inquiry Category</Label>
                  <Select value={formData.category} onValueChange={handleSelectChange}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="partnership">Partnership Opportunities</SelectItem>
                      <SelectItem value="technical">Technical Support</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="Enter subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Type your message here..."
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black"
              >
                Send Message
              </Button>
            </form>
          )}
        </div>

        <div>
          <h2 className="mb-6 font-display text-2xl font-extrabold tracking-tight text-[#171414]">Our Location</h2>

          <div className="overflow-hidden rounded-3xl border border-[#171414]/15 bg-[#F5F5F3]">
            <div className="h-[280px]">
              <iframe
                src="https://maps.google.com/maps?q=Abuja%2C%20Nigeria&z=11&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Sanad head office — Abuja, Nigeria"
              ></iframe>
            </div>
            <div className="border-t border-[#171414]/10 bg-white/60 p-6">
              <p className="kicker-gold">Head Office</p>
              <h3 className="mt-1 font-display text-xl font-bold text-[#171414]">Abuja, Nigeria</h3>
              <p className="mt-1 text-sm text-[#4A4A4A]">Federal Capital Territory, Nigeria</p>
            </div>
          </div>

          <div className="glass-panel mt-6 rounded-3xl border border-[#171414]/15 bg-white/60 p-6">
            <h3 className="mb-3 font-display text-xl font-bold text-[#171414]">Business Hours</h3>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#4A4A4A]">
              Abuja Head Office · WAT (GMT+1)
            </p>
            <ul className="space-y-2 text-[#4A4A4A]">
              <li className="flex justify-between">
                <span>Monday - Friday:</span>
                <span>9:00 AM - 6:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Saturday:</span>
                <span>9:00 AM - 1:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday & Public Holidays:</span>
                <span>Closed</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
