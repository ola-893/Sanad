import { siteKnowledgeBase } from "./knowledge-base"

type Message = {
  role: "user" | "assistant"
  content: string
}

// Function to generate a chat response based on user input and conversation history
export async function generateChatResponse(query: string, history: Message[]): Promise<string> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Convert query to lowercase for easier matching
  const lowerQuery = query.toLowerCase()

  // Check if query is about contact information
  if (
    lowerQuery.includes("contact") ||
    lowerQuery.includes("email") ||
    lowerQuery.includes("phone") ||
    lowerQuery.includes("call")
  ) {
    return `You can contact us at @sanadfinance on X`
  }

  // Check if query is about login or account
  if (lowerQuery.includes("login") || lowerQuery.includes("account") || lowerQuery.includes("sign in")) {
    return "You can login to your account by clicking the 'Login' button in the top right corner of the website. If you're an administrator, you can use the 'Admin Login' option."
  }

  // Check if query is about applying for financing
  if (
    lowerQuery.includes("apply") ||
    lowerQuery.includes("loan") ||
    lowerQuery.includes("financing") ||
    lowerQuery.includes("jewelry")
  ) {
    return "To apply for Shariah-compliant jewelry financing, click the 'Apply Now' button on our website. You'll need to complete KYC verification, submit your jewelry for assessment, connect your wallet, and then you'll receive a financing offer based on your jewelry's value."
  }

  // Check if query is about Ar-Rahnu
  if (lowerQuery.includes("ar-rahnu") || lowerQuery.includes("islamic") || lowerQuery.includes("shariah")) {
    return "Ar-Rahnu is an Islamic pawnbroking service that allows individuals to use their gold or jewelry as collateral to obtain short-term financing. Unlike conventional pawning, Ar-Rahnu operates according to Shariah principles, charging a safekeeping fee rather than interest on the loan, making it a halal alternative for those seeking quick access to funds."
  }

  // Check if query is about the company
  if (lowerQuery.includes("about") || lowerQuery.includes("company") || lowerQuery.includes("sanad") || lowerQuery.includes("sanad")) {
    return "Sanad Protocol is a platform that connects Ar-Rahnu operators with Shariah-compliant funders on Creditcoin 3, allowing them to expand their capacity to serve more customers effectively. Our mission is to become the preferred center for liquidity needs by providing a comprehensive platform that connects Ar-Rahnu operators and funders, creating a seamless ecosystem that benefits all participants in the Islamic financing space."
  }

  // Check if query is about NFTs
  if (lowerQuery.includes("nft") || lowerQuery.includes("token") || lowerQuery.includes("digital")) {
    return "We create a digital representation of your jewelry as an ERC-721 SAG NFT note on the Creditcoin 3 network, ensuring security and transparency throughout the financing process. This allows you to track your collateral status and provides an immutable layer of auditability."
  }

  // Check if query is about KYC
  if (lowerQuery.includes("kyc") || lowerQuery.includes("verification") || lowerQuery.includes("identity")) {
    return "KYC (Know Your Customer) verification is required to use our services. This involves providing your personal information, uploading identification documents, and completing facial verification. This process helps us ensure security and comply with regulatory requirements."
  }

  // Check if query is about payment
  if (lowerQuery.includes("payment") || lowerQuery.includes("repay") || lowerQuery.includes("pay back")) {
    return "You can make payments through multiple options including Creditcoin wallet, bank transfer, or credit/debit card. Our platform provides a convenient payment center where you can view your payment history, make payments, and set up automatic payments to avoid missing due dates."
  }

  // Check knowledge base for relevant information
  for (const item of siteKnowledgeBase) {
    if (lowerQuery.includes(item.keyword)) {
      return item.response
    }
  }

  // Fallback response with contact information
  return `I don't have specific information about that, but I'd be happy to connect you with our team who can help.

You can contact us at:
Email: frank@unitedalliedbusiness.com
Phone: 

Or visit our FAQ page for more information: https://sanad.finance/faq`
}
