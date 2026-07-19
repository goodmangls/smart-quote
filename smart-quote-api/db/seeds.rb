admin_password = ENV["ADMIN_DEFAULT_PASSWORD"]
if admin_password.blank?
  raise "ADMIN_DEFAULT_PASSWORD must be set before seeding admin users (refusing predictable default)"
end

[
  { email: "ceo@goodmangls.com", name: "CEO" },
  { email: "ken.jeon@goodmangls.com", name: "Ken Jeon" },
  { email: "jaehong.lim@goodmangls.com", name: "Jaehong Lim" },
  { email: "charlie@goodmangls.com", name: "Charlie" },
  { email: "ch.lee@jways.co.kr", name: "Charlie Lee" }
].each do |attrs|
  User.find_or_create_by!(email: attrs[:email]) do |u|
    u.password = admin_password
    u.password_confirmation = admin_password
    u.role = "admin"
    u.name = attrs[:name]
    u.company = "KS Ways"
  end
end

puts "Seeded #{User.count} admin users."

# Margin Rules
load Rails.root.join("db/seeds/margin_rules.rb")
