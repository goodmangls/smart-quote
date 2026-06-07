require "rails_helper"

RSpec.describe "production mailer configuration" do
  let(:production_config) { Rails.root.join("config/environments/production.rb").read }
  let(:render_blueprint) { Rails.root.join("../render.yaml").read }

  it "uses Resend SMTP with fail-fast RESEND_API_KEY lookup" do
    expect(production_config).to include('address: "smtp.resend.com"')
    expect(production_config).to include('user_name: "resend"')
    expect(production_config).to include('password: ENV.fetch("RESEND_API_KEY")')
    expect(production_config).not_to include("smtp.sendgrid.net")
    expect(production_config).not_to include("SENDGRID_API_KEY")
  end

  it "declares the required Resend env vars in the Render blueprint" do
    expect(render_blueprint).to include("key: RESEND_API_KEY")
    expect(render_blueprint).to include("key: MAILER_FROM")
    expect(render_blueprint).not_to include("SENDGRID_API_KEY")
  end
end
