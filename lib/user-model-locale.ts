import type { SurveyQuestion, SurveyStep } from "@/lib/user-model-survey";
import { budgetLabel, budgetOptions, MARKETS, type Market } from "@/lib/market";

type StepCopy = { title: string; description: string };
type QuestionCopy = { label: string; help: string; options?: string[]; left?: string; right?: string };

const STEP_EN: Record<string, StepCopy> = {
  life:{title:"Life",description:"How products fit into your real daily life and work."},
  finance:{title:"Budget",description:"Your practical spending room and financial comfort, without asking for income."},
  taste:{title:"Preferences",description:"What actually matters to you beyond spec sheets."},
  owned:{title:"What you own",description:"Whether your current products can solve the problem before you buy something new."},
  environment:{title:"Environment",description:"Where and under what physical conditions the product will be used."},
  past:{title:"Past purchases",description:"Use satisfaction and regret patterns to avoid repeating bad decisions."},
  future:{title:"Future plans",description:"Account for changes likely to happen over the next 3–12 months."},
  style:{title:"Decision style",description:"Personalize both the decision criteria and how the result is presented."},
  category:{title:"Categories",description:"Choose the high-consideration categories you deal with most often."},
  "category-laptop":{title:"Laptop details",description:"Match the laptop to real workloads and mobility before chasing specs."},
  "category-phone":{title:"Phone details",description:"Balance camera, battery, ecosystem, size and performance around your real use."},
  "category-car":{title:"Vehicle details",description:"Consider driving, parking, maintenance and ownership period together."},
  "category-tool":{title:"Power-tool details",description:"Match tools to battery platforms, job sites and usage frequency."},
};

const QUESTION_EN: Record<string, QuestionCopy> = {
  activity:{label:"Which life roles currently fit you?",help:"You can select more than one role. This helps estimate usage time, mobility and the cost of downtime.",options:["Student","Employee","Business owner","Freelancer","Field worker","Home · childcare","Other"]},
  mobility:{label:"How often do you carry the product?",help:"Frequent movement increases the importance of weight, size and battery life.",left:"Almost never",right:"Very often"},
  downtime:{label:"How disruptive is it if the product stops working?",help:"This affects reliability and after-sales-service priority.",left:"Low impact",right:"Work stops"},
  sharedUse:{label:"Who mainly uses the product?",help:"Multiple users can change account, durability, size and ease-of-use requirements.",options:["Only me","Shared with family","Shared with team · staff","Depends on the situation"]},
  budgetComfort:{label:"What price range feels comfortable?",help:"Not the absolute maximum you could pay, but the amount that would not strain normal life.",options:["Under ₩300K","₩300K–₩500K","₩500K–₩1M","₩1M–₩2M","₩2M–₩4M","₩4M+","Depends on the product"]},
  budgetMax:{label:"What is the maximum you would allow when it is genuinely worth it?",help:"This is the upper ceiling above your comfortable budget.",options:["Under ₩500K","₩500K–₩1M","₩1M–₩2M","₩2M–₩3M","₩3M–₩5M","₩5M+","No fixed maximum"]},
  installment:{label:"How do you feel about installments?",help:"This tells us whether total price or monthly burden matters more.",options:["Avoid if possible","Use when needed","Use if interest-free","Comfortable if monthly cost is low"]},
  resale:{label:"How important is resale value?",help:"Higher importance raises the weight of depreciation, used demand and residual value.",left:"Barely matters",right:"Very important"},
  performance:{label:"How much do you prioritize performance over price?",help:"Whether you would pay more for meaningful performance headroom.",left:"Price first",right:"Performance first"},
  design:{label:"Would you pay more for design when performance is similar?",help:"Covers exterior, materials, color and brand feel.",left:"Almost never",right:"Definitely"},
  stability:{label:"Do you prefer new technology or proven stability?",help:"Early-generation features lean left; mature, lower-risk choices lean right.",left:"New technology",right:"Proven stability"},
  brandFlex:{label:"How willing are you to change brands?",help:"Existing ecosystems and familiarity can make switching expensive.",left:"Brand-flexible",right:"Brand-locked"},
  replaceReason:{label:"Why are you considering a replacement?",help:"Multiple reasons can apply at once. We separate real pain from upgrade desire.",options:["Not enough performance","Broken · aging","Battery","Portability","New features","Compatibility","I simply want something new"]},
  ecosystem:{label:"How tied are you to your current accessories or ecosystem?",help:"Chargers, batteries, apps, files and peripherals can create switching costs.",left:"Very flexible",right:"Strongly locked in"},
  keepOld:{label:"What will you do with the current product after buying a new one?",help:"Selling lowers effective cost; keeping it can make a new purchase less necessary.",options:["Sell it","Keep using it","Give to family · friend","Store it","Dispose of it","Undecided"]},
  backup:{label:"Do you have a backup if the product fails?",help:"You can select both a product you own and another fallback such as borrowing.",options:["Yes","No","Can borrow or substitute","Depends on the situation"]},
  place:{label:"Where do you mainly use it?",help:"Select every real environment so weight, durability and battery needs can be combined.",options:["Home","Office","School","On the move","Job site","Vehicle","Outdoors","Mixed"]},
  harsh:{label:"How much dust, water, heat or cold exposure is there?",help:"Higher exposure raises the importance of durability, ingress protection and serviceability.",left:"Almost none",right:"Very harsh"},
  noise:{label:"How much do noise, heat and size affect your purchase?",help:"A product can be fast but still unpleasant if it is noisy, hot or bulky.",left:"Barely matters",right:"Very important"},
  space:{label:"How much installation or storage space do you have?",help:"Space can be a hard constraint for appliances, tools and desk setups.",options:["Plenty","Average","Tight","Easy storage · moving matters","Depends on the product"]},
  regret:{label:"Which purchase mistakes have you made repeatedly?",help:"Choose all that apply so BUYSOR can guard against the same failure patterns.",options:["Over-spec","Bought too cheap","Impulse purchase","Bad used condition","Service problems","Compatibility failure","Almost none"]},
  research:{label:"How much time do you usually spend comparing before buying?",help:"This helps tune answer length and number of alternatives.",options:["Under 10 minutes","About an hour","A day","Several days","Several weeks+"]},
  usedExperience:{label:"What has your used-product experience been like?",help:"Good and bad experiences can coexist, so multiple selections are allowed.",options:["None","Good","Average","Had a bad experience","Buy used often"]},
  regretRisk:{label:"How strongly do you want to avoid post-purchase regret?",help:"Higher values make WAIT and verification requirements more conservative.",left:"Decide quickly",right:"Minimize regret"},
  change:{label:"Any major life changes within the next 12 months?",help:"Select all relevant events because several changes can affect the same product decision.",options:["None","Moving","Job change","Starting · finishing school","Living abroad","Long trip","Family change","Business · work change"]},
  wait:{label:"How long can you realistically delay the purchase if needed?",help:"Choose how long you can actually cope, not simply when you would like to buy.",options:["Today","1 week","1 month","3 months","6 months+"]},
  ownership:{label:"How long do you tend to keep one product?",help:"Long ownership increases the weight of durability and long-term value.",left:"Replace often",right:"Keep for years"},
  futureExpansion:{label:"How likely is your usage to increase?",help:"If future workload is likely to rise, some extra headroom may be justified.",options:["Likely to decrease","About the same","Increase a little","Increase a lot","Not sure"]},
  risk:{label:"How risk-averse are you about new, used or lightly verified products?",help:"Higher values favor proven products, warranty and lower failure risk.",left:"Accept risk",right:"Safety first"},
  used:{label:"How open are you to used products?",help:"Higher values make used pricing, depreciation and condition checks more relevant.",left:"New only",right:"Used if condition is good"},
  answerStyle:{label:"How do you want BUYSOR to answer?",help:"This changes presentation, not the underlying decision standard.",options:["One conclusion","2–3 candidates","Conclusion first + reasons","Detailed reasoning","Scenario-based answer"]},
  overbuy:{label:"How comfortable are you buying extra headroom?",help:"How much over-spec is acceptable when future demand is uncertain.",left:"Only what I need",right:"Leave headroom"},
  category:{label:"Which high-consideration categories do you deal with most often?",help:"Select more than one. BUYSOR will add deeper questions for the categories you choose.",options:["Laptop","Smartphone","Car","Power tools","Home appliances","Other"]},
  categoryDepth:{label:"How much technical detail are you comfortable answering?",help:"Left keeps only essentials; right can include compatibility, maintenance and performance details.",left:"Essentials only",right:"Very detailed"},
  simulation:{label:"How much do you want multi-scenario comparison?",help:"Higher values favor BUY / WAIT / use-current alternatives rather than a single path.",left:"One conclusion",right:"Several scenarios"},
  purchaseFrequency:{label:"How often do you buy high-consideration products?",help:"Frequency influences report cadence and how useful re-check reminders are.",options:["Once a year or less","Every 6 months","Quarterly","Monthly","Frequently for work"]},
  laptopWorkload:{label:"What workloads do you actually run?",help:"Select every meaningful workload so the bottleneck is based on use, not prestige specs.",options:["Docs · web","Development","Photo editing","Video editing","3D · CAD","Gaming","AI · data"]},
  laptopPortability:{label:"How important is portability?",help:"Higher values give more weight to weight, charger size and battery.",left:"Mostly stationary",right:"Carry every day"},
  laptopOS:{label:"Which operating systems do you need?",help:"Specific software or peripherals may make the OS a hard constraint.",options:["macOS","Windows","No preference","Not sure yet"]},
  laptopDisplay:{label:"How many external monitors do you use?",help:"Multiple displays can make ports and GPU output more important than the built-in screen.",options:["None","1","2+","Depends"]},
  laptopBattery:{label:"How important is battery life?",help:"Long unplugged use raises the importance of efficiency and real-world endurance.",left:"Low",right:"Critical"},
  laptopLongevity:{label:"How important is 4+ years of useful life?",help:"Long ownership raises the value of memory, storage and support headroom.",left:"Around 2 years",right:"4+ years"},
  phoneCamera:{label:"How important is the camera?",help:"Whether camera quality is a real purchase driver or just a nice-to-have.",left:"Basic records",right:"Very important"},
  phoneBattery:{label:"How important is battery life?",help:"Reflects charging frequency and long periods away from power.",left:"Average",right:"Top priority"},
  phoneSize:{label:"What size do you prefer?",help:"Balances portability against video and gaming immersion.",options:["Small and light","Medium","Large screen","No preference"]},
  phoneEcosystem:{label:"Which ecosystems do you currently use?",help:"Watches, earbuds and computers can make ecosystem switching costly.",options:["Apple","Galaxy","Other Android","Mixed","No preference"]},
  phoneGaming:{label:"How much gaming or high-performance app use?",help:"Higher values increase the weight of chip performance, thermals and display.",left:"Almost none",right:"A lot"},
  phoneCycle:{label:"What is your average phone replacement cycle?",help:"Longer cycles increase the importance of battery longevity and software support.",options:["1–2 years","2–3 years","3–4 years","4+ years"]},
  carDistance:{label:"How far do you drive per month?",help:"Mileage strongly affects energy cost, EV economics and depreciation.",options:["Under 500 km","500–1,000 km","1,000–2,000 km","2,000 km+","Not sure"]},
  carPassengers:{label:"How many people usually ride in the vehicle?",help:"This affects vehicle size, seats and cargo needs.",options:["1","2","3–4","5+","Depends"]},
  carParking:{label:"What parking and charging environments do you have?",help:"Select all relevant environments such as home and work.",options:["Dedicated parking + charging","Parking only","Rely on public charging","Tight parking constraints","Not sure"]},
  carCondition:{label:"New or used vehicle preference?",help:"Balances depreciation, warranty and initial cost.",options:["New only","Prefer new","Used is fine","Actively consider used"]},
  carOwnership:{label:"Expected ownership period?",help:"Short ownership emphasizes depreciation; long ownership emphasizes durability and maintenance.",options:["2 years or less","3–5 years","6–8 years","9+ years"]},
  carMaintenance:{label:"How much maintenance burden can you accept?",help:"Higher values allow choices with more complex upkeep.",left:"Must be simple",right:"Can manage it"},
  toolWork:{label:"What kinds of work do you do?",help:"Select all real job types because torque, precision, dust control and safety needs differ.",options:["Woodworking","Interior work","Electrical · plumbing","Auto repair","Metalwork","DIY","Mixed"]},
  toolPlatform:{label:"Which battery platforms do you already own?",help:"Select all platforms you own because batteries and chargers create switching costs.",options:["Makita","Milwaukee","DeWalt","Bosch","HiKOKI","Other","None"]},
  toolFrequency:{label:"How often do you use power tools?",help:"Professional daily use changes durability and value requirements.",options:["Monthly or less","Weekly","2–4 times/week","Almost daily","All-day professional use"]},
  toolCordless:{label:"How necessary is cordless operation?",help:"Frequent movement can justify battery weight for cordless flexibility.",left:"Corded is fine",right:"Cordless required"},
  toolDust:{label:"How harsh is the dust and impact environment?",help:"Higher values raise the weight of durability and service support.",left:"Clean environment",right:"Harsh job site"},
  toolService:{label:"How important are service and parts availability?",help:"If downtime is expensive, repair speed and parts access matter more.",left:"Low",right:"Very important"},
};

export function getStepCopy(step: SurveyStep, language: "ko" | "en") {
  if (language === "ko") return { title: step.title, description: step.description };
  return STEP_EN[step.id] ?? { title: step.title, description: step.description };
}
export function getQuestionCopy(question: SurveyQuestion, language: "ko" | "en") {
  if (language === "ko") return { label: question.label, help: question.help, options: question.options ?? [], left: question.left ?? "", right: question.right ?? "" };
  const copy = QUESTION_EN[question.id];
  return { label: copy?.label ?? question.label, help: copy?.help ?? question.help, options: copy?.options ?? question.options ?? [], left: copy?.left ?? question.left ?? "", right: copy?.right ?? question.right ?? "" };
}
export function getOptionLabel(question: SurveyQuestion, option: string, language: "ko" | "en", market: Market = 'US') {
  const budget = budgetLabel(option, language);
  if (budget) return budget;
  if (question.id === 'carDistance' && option.startsWith('distance:mi:')) {
    const labels = language === 'ko' ? ['월 300마일 미만','300–600마일','600–1,200마일','1,200마일 이상','잘 모르겠음'] : ['Under 300 mi/month','300–600 mi/month','600–1,200 mi/month','1,200 mi+/month','Not sure'];
    return labels[Number(option.split(':')[2])] ?? option;
  }
  if (language === "ko") return option;
  const index = question.options?.indexOf(option) ?? -1;
  return index >= 0 ? (QUESTION_EN[question.id]?.options?.[index] ?? option) : option;
}
export function getSurveyOptions(question: SurveyQuestion, language: 'ko' | 'en', market: Market, answer?: unknown) {
  let options = (question.options ?? []).map(value => ({ value, label: getOptionLabel(question, value, language, market) }));
  if (question.id === 'budgetComfort' || question.id === 'budgetMax') options = budgetOptions(MARKETS[market].currency, question.id === 'budgetComfort' ? 'comfort' : 'max', language);
  if (question.id === 'carDistance' && MARKETS[market].distance === 'mi') options = Array.from({length:5},(_,i)=>({value:`distance:mi:${i}`,label:getOptionLabel(question,`distance:mi:${i}`,language,market)}));
  // Retain a saved answer in its original currency or units while offering the new region's choices.
  if (typeof answer === 'string' && !options.some(row=>row.value===answer)) {
    const label=getOptionLabel(question,answer,language,market);
    options.unshift({value:answer,label:`${label} (${language==='ko'?'저장된 답변':'saved answer'})`});
  }
  return options;
}
export function hasCompleteEnglishSurveyCopy(question: SurveyQuestion) {
  const copy = QUESTION_EN[question.id];
  if (!copy?.label || !copy.help) return false;
  if (question.options && copy.options?.length !== question.options.length) return false;
  if (question.kind === "scale" && (!copy.left || !copy.right)) return false;
  return true;
}
