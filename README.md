# Skýrsla

## Inngangur

Í þessu verkefni var hannaður og útfærður vefur sem gerir skráðum notendum kleift að búa til, geyma og stjórna glósupökkum á skipulagðan og aðgengilegan hátt. Notendur geta valið hvort þeir halda glósupökkunum sínum út af fyrir sig eða deila þeim með öðrum. Vefurinn innleiðir aðgangsstýringu til að tryggja að einungis viðeigandi notendur hafi aðgang að viðkomandi glósum. Markmiðið er að skapa öruggt og notendavænt umhverfi fyrir gerð og notkun glósna.

## Útfærsla

Hér eru slóðir á útfærslur á bakenda og framenda:

Framendi- https://github.com/villimani/Einstaklingsverkefni_framendi

Bakendi - https://github.com/villimani/Api_einstaklingsverkefni_Veff2

Hér er slóð á hýsingu af verkefninu- https://einstaklingsverkefni-framendi.vercel.app



Kerfið samanstendur af:

- **Bakendi** Bakendinn er útfærður með hono typescript
- **Gagnagrunnur** (PostgreSQL) með Prisma sem ORM og er hýstur á Neon
- **REST API** vefþjónusta er útfærð sem sér um samskipti við bakendann
- **Framendi** er útfærður með Next.js (React framework)
- **Verkefni sett upp í hýsingu** Framendi hýstur á Vercel, bakendi hýstur á Render 
- **Notendaumsjón**: Notendur hafa eigin aðgang og geta stjórnað aðgangi að glósunum sínum



Þessi skylrði voru valin vegna þess að þetta er allt eitthvað sem er nauðsynlegt til þess að hafa vefsíðu þar sem hægt er að deila gögnum á milli aðila. 

Til þess að geta geymt gögn og deila þeim á milli þá þarf að hafa gagnagrunn sem geymir öll gögnin og til þess að hægt sé að nýta gögnin þarf að hafa bakenda sem getur sótt, sent og breytt gögnunum. Til þess að hægt sé að hafa vefsíðu þarf að hafa vefþjónustu sem getur útfært samskipti bakendans og framendans og til þess að notendur geti nýtt vesíðuna þarf að sjálfsögðu að vera framendi sem er hýstur. Þó að notendaumsjón sé kannski ekki nauðsynleg til að búa til vefsíðu þar sem hægt er að deila gögnum þá veitir hún meiri möguleika til þess að stjórna hver sér hvað og hver getur breytt hverju og því hentar það mjög vel fyrir þetta verkefni að innihalda notendaumsjón.

## Tækni

### Bakendi
- **Hono**  
  Hono var valið vegna þess að það er hratt og frekar þæginlegt í uppsetningu einng vegna þess að það hentar vel fyrir minni API.
- **Prisma**  
  Prisma var valið vegna þess að það einfaldar vinnslu með gagnagrunninn.
- **PostgreSQL**  
  Þæginlegur gagnagrunnur sem hentar vel fyrir þetta verkefni.
- **Zod + JWT**  
  Zod hjálpar til við að staðfesta gögnin sem koma inn og JWT sér um örugga innskráningu.

### Framendi
- **Next.js**  
  Valið til þess að hægt væri að gera React framework sem er hratt og er með gott routing.
- **TypeScript**  
   Notað til að gera læsilegann og góðann kóða.
- **CSS**  
  Til að forðast árekstra í stílunum ásamt því að halda kóðanum skipulagðum.

### Verkfæri & Umhverfi
- **Git**  
  Til að halda utan um breytingar og hjálpa til við hýsingu.
- **Render/Vercel**  
  Notað til að hýsa verkefnið á góðan máta.

## Hvað gekk vel

Það gekk mjög vel að setja upp bakenda og REST API sem og láta það vinna með framendanum til þess að sækja, búa til og breyta gögnum. Grunnvirknin á öllir síðunni var komin upp á engri stundu og virkaði allt eins og búast ætti við mjög snöggt og örugglega. Það var mjög þæginlegt að vinna með React frameworkið þar sem það setur fram skýra og góða leið til þess að búa til framenda sem er þæginlegt að nota sem og að búa til.

## Hvað gekk illa

Þó að það gekk vel að koma allri grunnvirkni úpp þá var frekar erfitt að fínpússa síðuna þannig að allt liti vel út og væri í stíl. Mér fannst sérstaklega erfitt að reyna að gera css skrár sem ekki sköruðust á þannig það var auðvelt að gera grunnvriknina en útlitið var aðeins erfiðara. Einnig gekk illa fyrir mig að átta mig á því hvenær ætti að stoppa mér fannst alltaf vera hægt að gera aðeins meira og að láta þetta líta aðeins betur út þannig að stundum fór vinna í parta af síðunni sem hefði kannski betur mátt vera nýttur einhverstaðar annarstaðar.

## Hvað var áhugavert

Það var mjög áhguavert að fá tilfininguna fyrir því hvernig það er að búa til vefsíðu það veitti fannst mér góða innsýn hvernig starf forritara er og hvernig hugbúnaðarþróun fer fram. Til dæmis fannst mér áhugavert hvernig maður áttar á sig hvað tæki og tól henta best fyrir verkefnið og hvernig maður áttar sig alltaf betur og betur á því hvernig er best að útfæra vefsíðuna þannig notendaupplifunin og bakendinn sé framkvæmdur sem allra best. Einnig var mjög áhugavert að átta sig á því hversu mikil vinna fer í að láta allt líta vel út og hversu mikilvægt það er að það sé allt stílhreint þar sem ég tók eftir því að sem betur sem síðan leit út því meira fannst mér ég fá út úr glósum þar að segja þegar engin css virkni var þá voru glósurnar ekki jafn áberandi og eftirminnilegar. 

## Uppfærður matskvarði á verkefninu

### Matskvarði
- 50% React framendi útfærður
- 30% Bakendi með REST API útfærður
- 10% SQL gagnagrunnur útfærður
- 10% Vefþjónusta sett upp í hýsingu 
