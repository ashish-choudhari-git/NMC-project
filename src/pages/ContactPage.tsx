import { Phone, Mail, MapPin, Clock, Send, CheckCircle, Globe } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from("contact_messages").insert({
      name: formData.name,
      email: formData.email,
      message: formData.message,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Failed to Send",
        description: "Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setIsSuccess(true);
    setFormData({ name: "", email: "", message: "" });

    toast({
      title: "Message Sent!",
      description: "We will get back to you soon.",
    });
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Contact Nagpur Municipal Corporation
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            For civic services, complaints, or general inquiries, please reach
            out to Nagpur Municipal Corporation through the details below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="space-y-4">
            {/* Phone */}
            <div className="nmc-card p-6">
              <div className="nmc-icon-box-primary mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Phone & Fax
              </h3>
              <p className="text-muted-foreground text-sm mb-1">
                Phone: +91-712-2567000
              </p>
              <p className="text-muted-foreground text-sm">
                Fax: +91-712-2567035
              </p>
            </div>

            {/* Email */}
            <div className="nmc-card p-6">
              <div className="nmc-icon-box-accent mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Email</h3>
              <p className="text-muted-foreground text-sm">
                commissioner@nmc.gov.in
              </p>
            </div>

            {/* Address */}
            <div className="nmc-card p-6">
              <div className="nmc-icon-box-primary mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Address</h3>
              <p className="text-muted-foreground text-sm">
                Nagpur Municipal Corporation<br />
                Civil Lines<br />
                Nagpur – 440001<br />
                Maharashtra, India
              </p>
            </div>

            {/* Office Hours */}
            <div className="nmc-card p-6">
              <div className="nmc-icon-box-accent mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Office Hours
              </h3>
              <p className="text-muted-foreground text-sm mb-1">
                Monday – Friday: 10:00 AM – 5:00 PM
              </p>
              <p className="text-muted-foreground text-sm">
                Saturday: 10:00 AM – 2:00 PM
              </p>
            </div>

            {/* Website */}
            <div className="nmc-card p-6">
              <div className="nmc-icon-box-primary mb-4">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Official Website
              </h3>
              <a
                href="https://nmcnagpur.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm underline"
              >
                https://nmcnagpur.gov.in/
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="nmc-card p-8">
              {isSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    We will get back to you as soon as possible.
                  </p>
                  <Button
                    onClick={() => setIsSuccess(false)}
                    className="nmc-btn-primary"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    Send us a Message
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              name: e.target.value,
                            })
                          }
                          className="nmc-input"
                          placeholder="Enter your name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Your Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              email: e.target.value,
                            })
                          }
                          className="nmc-input"
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Your Message *
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            message: e.target.value,
                          })
                        }
                        className="nmc-input resize-none"
                        placeholder="Type your message here..."
                      />
                    </div>

                    <Button
                      type="submit"
                      className="nmc-btn-primary gap-2"
                      disabled={isSubmitting}
                    >
                      <Send className="w-4 h-4" />
                      {isSubmitting ? "Sending..." : "Submit"}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ContactPage;