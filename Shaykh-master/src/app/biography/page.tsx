
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function BiographyPage() {
  const { currentLanguage } = useLanguage();

  const pageTexts = {
    en: {
      pageTitle: "Biography of Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān al-Saʿd",
      pageSubtitle: "An overview of the Shaykh's life, studies, and contributions.",
      shaykhFullName: "Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān ibn Muḥammad Āl Saʿd al-Muṭayrī",

      lineageTitle: "Lineage and Upbringing",
      lineageP1: "He is the Shaykh, the Allamah (Profound Scholar), the Muhaddith (Hadith Scholar) ʿAbdullāh ibn ʿAbd al-Raḥmān ibn Muḥammad Āl Saʿd al-Muṭayrī. He was born in the city of Al-Zubayr in 1381 AH. He then settled in Riyadh, where he completed his secondary education, initially enrolling in the natural sciences department. Later, a love for Islamic legal studies was instilled in him, and in his third year, he transferred to the Scientific Institute. After completing his secondary education, he joined Imam Muhammad ibn Saud Islamic University, Faculty of Usul al-Din (Fundamentals of Religion), Department of Sunnah, from which he graduated.",

      shaykhsTitle: "His Shaykhs",
      shaykhsIntro: "The Shaykh studied under and read to many scholars of his time, among them:",
      shaykhsList: [
        "Shaykh ʿAbd al-ʿAzīz ibn ʿAbdullāh ibn Bāz, may Allah have mercy on him. He attended the Shaykh's lessons which were held in the Grand Mosque, and at that time, the Shaykh (ʿAbdullāh al-Saʿd) was at the end of his second year of secondary school.",
        "Shaykh ʿAbdullāh ibn Ḥumayd, may Allah have mercy on him. He attended his lessons approximately a year and a half before his passing.",
        "Shaykh Muḥammad ibn Ṣāliḥ al-ʿUthaymīn, may Allah have mercy on him. The Shaykh used to visit him in ʿUnayzah during the long holidays.",
        "Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān al-Jibrīn, may Allah have mercy on him. The Shaykh attended his gatherings and read to him briefly.",
        "Shaykh Fahd ibn Ḥumayn al-Fahd, may Allah have mercy on him. Shaykh Fahd's lessons were held in his home in al-Baṭḥāʾ.",
        "Shaykh ʿAbdullāh al-Duwaysh, may Allah have mercy on him. Shaykh al-Duwaysh was one of the senior Hadith scholars of his time. The Shaykh read to him briefly from \"Al-Jāmiʿ\" by Abū ʿĪsā al-Tirmidhī during his stay in ʿUnayzah.",
        "Shaykh ʿAbd al-Raḥmān ibn Nāṣir al-Barrāk, may Allah preserve and protect him. He attended his lessons for a short period, which covered Tawhid and Nahw (Arabic Grammar).",
        "Shaykh ʿAbdullāh ibn ʿAbd al-ʿAzīz al-ʿAqīl, may Allah have mercy on him. He was one of the senior Hanbali scholars of his time.",
        "Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān al-Ghudayyān, may Allah have mercy on him. He was one of the senior Usul (Fundamentals of Jurisprudence) scholars of his time.",
        "Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān al-Bassām, may Allah have mercy on him. He studied Fiqh with him briefly from the book \"Sharḥ al-Zarkashī ʿalā Mukhtaṣar al-Khiraqī.\"",
      ],

      lessonsTitle: "Academic Lessons",
      lessonsIntro1: "The Shaykh has delivered numerous lessons, some of which are commentaries on academic texts, annotations on books, or foundational explanations of scholarly issues.",
      lessonsIntro2: "Among the books the Shaykh has explained and commented on in his lessons are:",
      lessonsList: [
        "Kitāb al-Sunnah by ʿAbdullāh ibn Aḥmad.",
        "Kitāb al-Tawḥīd by Ibn Khuzaymah.",
        "Al-ʿAqīdah al-Wāsiṭiyyah by Ibn Taymiyyah.",
        "Darajāt al-Ṣāʿidīn ilā Maqāmāt al-Muwaḥḥidīn.",
        "Ṣaḥīḥ al-Bukhārī, and Ṣaḥīḥ Muslim.",
        "The Four Sunan (Abū Dāwūd, al-Tirmidhī, al-Nasāʾī, Ibn Mājah).",
        "Al-Sunan al-Kubrā by al-Nasāʾī.",
        "Al-Muwaṭṭaʾ by Imam Mālik.",
        "Ṣaḥīḥ Ibn Khuzaymah.",
        "Al-Iḥsān fī Taqrīb Ṣaḥīḥ Ibn Ḥibbān.",
        "Al-Muntaqā by Ibn al-Jārūd.",
      ],
      lessonsOutro: "And many other books.",

      worksTitle: "His Published Works",
      worksIntro: "The Shaykh, may Allah preserve him, has authored numerous works in Hadith sciences and other fields, including:",
      worksList: [
        "Kayfa Takūnu Muḥaddithan (How to Be a Muhaddith), Dār al-Idāwah.",
        "Al-Burhān fī Wujūb al-Lujūʾ ilā al-Wāḥid al-Dayyān (The Proof of the Obligation to Resort to the One, the Judge), Dār al-Muḥaddith.",
        "Fatḥ al-Wāḥid al-ʿAlī fī al-Difāʿ ʿan Ṣaḥābat al-Nabī (PBUH) (The Opening of the One, the Most High, in Defense of the Companions of the Prophet PBUH), Dār al-Muḥaddith.",
        "Al-Ḥūthiyyūn wa Bayān Khaṭarihim ʿalā al-Ummah (The Houthis and an Explanation of Their Danger to the Ummah).",
        "Al-Iʿlām fī Bayān Khaṭar al-Zaḥf al-Majūsī ʿalā Bilād al-Islām (The Declaration on the Danger of the Magian Encroachment on Muslim Lands), Dār al-Idāwah.",
        "Maʿrifat Marātib al-Thiqāt (Knowing the Ranks of Reliable Narrators), Dār al-Ḥaḍārah.",
        "Muqaddimah (Al-Arbaʿūn al-Thulāthiyyah) (Introduction to the Forty Trilateral Hadiths), Dār al-Muḥaddith.",
        "Ittibāʿ al-Ṣirāṭ fī al-Radd ʿalā Duʿāt al-Ikhtilāṭ (Following the Straight Path in Refuting the Advocates of Free Mixing), Dār al-Muḥaddith.",
        "Al-Taysīr bayna al-Mashrūʿ wa al-Mamnūʿ (Facilitation Between the Legislated and the Prohibited), Dār al-Muḥaddith.",
        "Umm Sulaym: Durūs wa ʿIbar (Umm Sulaym: Lessons and Morals), Dār al-Idāwah.",
      ],
      worksOutro: "This is in addition to the books for which the Shaykh, may Allah preserve him, wrote introductions and commentaries for authors among shaykhs and students of knowledge, exceeding eighty introductions.",


      adminNote: "This biography is based on provided information and can be further refined by the site administrator.",
    },
    ar: {
      pageTitle: "سيرة الشيخ عبد الله بن عبد الرحمن السعد",
      pageSubtitle: "نُبذة عن حياة الشيخ، ومسيرته العلمية، ومساهماته في خدمة العلم الشرعي.",
      shaykhFullName: "الشيخ العلّامة المحدث عبد الله بن عبد الرحمن بن محمد آل سعد المطيري",

      lineageTitle: "النسب والنشأة",
      lineageP1: "هو الشيخ العلّامة المحدث عبد الله بن عبد الرحمن بن محمد آل سعد المطيري، وُلد في مدينة الزبير عام ١٣٨١هـ.\nثم انتقل إلى مدينة الرياض حيث أكمل تعليمه الثانوي، وقد التحق بدايةً بقسم العلوم الطبيعية.\nغير أن حب العلوم الشرعية غُرس في نفسه، فانتقل في السنة الثالثة إلى المعهد العلمي.\nوبعد أن أنهى المرحلة الثانوية، التحق بـ جامعة الإمام محمد بن سعود الإسلامية، كلية أصول الدين، قسم السنة، وتخرّج منها.",

      shaykhsTitle: "مشايخه",
      shaykhsIntro: "تلقّى الشيخ العلم وقرأ على عدد من كبار العلماء في عصره، ومنهم:",
      shaykhsList: [
        "الشيخ عبد العزيز بن عبد الله بن باز – رحمه الله – حيث حضر دروسه التي كانت تُقام في المسجد الحرام، وكان الشيخ عبد الله السعد حينها في نهاية السنة الثانية من المرحلة الثانوية.",
        "الشيخ عبد الله بن حميد – رحمه الله – وحضر دروسه قرابة سنة ونصف قبل وفاته.",
        "الشيخ محمد بن صالح العثيمين – رحمه الله – وكان الشيخ يزوره في مدينة عنيزة خلال الإجازات الطويلة.",
        "الشيخ عبد الله بن عبد الرحمن الجبرين – رحمه الله – وقد حضر مجالسه وقرأ عليه قراءة يسيرة.",
        "الشيخ فهد بن حمين الفهد – رحمه الله – وكانت دروسه تُقام في منزله بحي البطحاء.",
        "الشيخ عبد الله الدويش – رحمه الله – وكان من كبار علماء الحديث في زمانه، وقد قرأ عليه الشيخ قراءة يسيرة من كتاب \"الجامع\" للإمام الترمذي أثناء إقامته في عنيزة.",
        "الشيخ عبد الرحمن بن ناصر البرّاك – حفظه الله – وحضر له دروسًا في التوحيد والنحو لفترة قصيرة.",
        "الشيخ عبد الله بن عبد العزيز العقيل – رحمه الله – وكان من كبار علماء الحنابلة في عصره.",
        "الشيخ عبد الله بن عبد الرحمن الغديان – رحمه الله – وكان من كبار علماء أصول الفقه في زمنه.",
        "الشيخ عبد الله بن عبد الرحمن البسّام – رحمه الله – وقد درس عنده الفقه لفترة يسيرة من كتاب \"شرح الزركشي على مختصر الخرقي\".",
      ],

      lessonsTitle: "الدروس العلمية",
      lessonsIntro1: "ألقى الشيخ عددًا كبيرًا من الدروس العلمية، شملت شروحًا على متون علمية، وتعليقات على كتب، وبيانات تأصيلية في مسائل علمية متعددة.",
      lessonsIntro2: "ومن الكتب التي شرحها وعلّق عليها في دروسه:",
      lessonsList: [
        "كتاب السنة للإمام عبد الله بن أحمد",
        "كتاب التوحيد للإمام ابن خزيمة",
        "العقيدة الواسطية لشيخ الإسلام ابن تيمية",
        "درجات الصاعدين إلى مقامات الموحّدين",
        "صحيح البخاري وصحيح مسلم",
        "السنن الأربع (أبو داود، الترمذي، النسائي، وابن ماجه)",
        "السنن الكبرى للإمام النسائي",
        "الموطأ للإمام مالك",
        "صحيح ابن خزيمة",
        "الإحسان في تقريب صحيح ابن حبان",
        "المنتقى للإمام ابن الجارود",
      ],
      lessonsOutro: "وغيرها من الكتب الكثيرة",

      worksTitle: "مؤلفاته المطبوعة",
      worksIntro: "للشيخ حفظه الله مؤلفات عديدة في علوم الحديث وغيره، منها:",
      worksList: [
        "كيف تكون محدثًا إصدار دار الإداوة.",
        "البرهان في وجوب اللجوء إلى الواحد الديان إصدار دار المحدث.",
        "فتح الواحد العلي في الدفاع عن صحابة النبي صلى الله عليه وسلم إصدار دار المحدث.",
        "الحوثيون وبيان خطرهم على الأمة.",
        "الإعلام في بيان خطر الزحف المجوسي على بلاد الإسلام إصدار دار الإداوة.",
        "معرفة مراتب الثقات دار الحضارة.",
        "مُقدّمة (الأربعون الثُّلاثية) إصدار دار المحدث.",
        "اتباع الصراط في الرد على دعاة الاختلاط إصدار دار المحدث.",
        "التيسير بين المشروع والممنوع إصدار دار المحدث.",
        "أم سليم دروس وعبر إصدار دار الإداوة.",
      ],
      worksOutro: "وهذا فضلا عن الكتب التي قدم لها الشيخ حفظه الله بمقدمات وتعليقات لمؤلفين من مشايخ وطلبة العلم جاوزت ثمانين مقدمة.",


      adminNote: "هذه السيرة الذاتية مبنية على المعلومات المقدمة ويمكن لمدير الموقع تنقيحها.",
    }
  };
  
  const T = pageTexts[currentLanguage as 'en' | 'ar'];

  return (
    <div className="max-w-4xl mx-auto space-y-8" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 font-headline">
          {T.pageTitle}
        </h1>
        <p className="text-lg text-muted-foreground">
          {T.pageSubtitle}
        </p>
      </header>

      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="p-0  relative h-64 md:h-80">
          <Image
            src="/AdobeStock_302564300.jpeg"
            alt={currentLanguage === 'en' ? "Shaykh ʿAbdullāh al-Saʿd" : "الشيخ عبد الله السعد"}
            layout="fill"
            objectFit="cover"
            className="opacity-80"
            data-ai-hint="scholar portrait"
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
           <div className={`absolute bottom-0 p-6 md:p-8 ${currentLanguage === 'ar' ? 'right-0 text-right' : 'left-0 text-left'}`}>
             <h2 className="text-3xl font-semibold text-white font-headline">{T.shaykhFullName}</h2>
           </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          
          <section>
            <h3 className="text-2xl font-semibold text-primary mb-3 font-headline">{T.lineageTitle}</h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {T.lineageP1}
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-primary mb-3 font-headline">{T.shaykhsTitle}</h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {T.shaykhsIntro}
            </p>
            <ul className={`list-disc text-foreground/80 space-y-2 mb-4 ${currentLanguage === 'ar' ? 'list-inside pr-4' : 'list-inside pl-4'}`}>
              {T.shaykhsList.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
          
          <section>
            <h3 className="text-2xl font-semibold text-primary mb-3 font-headline">{T.lessonsTitle}</h3>
            <p className="text-foreground/80 leading-relaxed mb-2">
              {T.lessonsIntro1}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {T.lessonsIntro2}
            </p>
            <ul className={`list-disc text-foreground/80 space-y-1 mb-4 ${currentLanguage === 'ar' ? 'list-inside pr-4' : 'list-inside pl-4'}`}>
              {T.lessonsList.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p className="text-foreground/80 leading-relaxed">
              {T.lessonsOutro}
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-primary mb-3 font-headline">{T.worksTitle}</h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {T.worksIntro}
            </p>
            <ul className={`list-disc text-foreground/80 space-y-1 mb-4 ${currentLanguage === 'ar' ? 'list-inside pr-4' : 'list-inside pl-4'}`}>
              {T.worksList.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p className="text-foreground/80 leading-relaxed">
              {T.worksOutro}
            </p>
          </section>
          

          
          <section className="mt-8 border-t pt-6">
             <p className="text-sm text-muted-foreground text-center">
                {T.adminNote}
             </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

    