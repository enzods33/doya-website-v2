-- Étend la bio éditable aux nouvelles langues publiques.
-- Ne modifie jamais les textes existants : les nouvelles lignes sont ajoutées uniquement si absentes.

alter table public.site_bio
  drop constraint if exists site_bio_locale_check;

alter table public.site_bio
  add constraint site_bio_locale_check
  check (locale in ('fr', 'es', 'en', 'pt', 'de', 'ja', 'ko', 'zh'));

insert into public.site_bio (locale, lead, body) values
(
  'de',
  'Zwei Schwestern. Zwei Stimmen. Ein Puls.',
  'Marina und Mélissa wachsen in Frankreich in einer spanischen Familie auf, mit Flamenco als ihrer ersten gemeinsamen Sprache. Am Konservatorium von Tarbes lernen sie Violine, Saxofon und Schlagwerk. Ihre Jugendjahre in Andalusien erweitern diese Palette um Gesang, Gitarre und Cajón. Von Anfang an entsteht ihre Musik im Dialog zwischen klassischer Disziplin, populärem Instinkt und Freiheit.

2018 wird diese Verbindung zu DOYA. Das Duo verbindet die Kraft zweier Stimmen mit Flamenco, Latin, Pop und elektronischen Farben. Auf der Bühne ist ihre Verbundenheit unmittelbar spürbar. Von Spanien bis Portugal, von der Salle Pleyel bis zu den französischen Zénith-Hallen entwickeln sie eine warme, körperliche und präzise Klangsprache.

Ihr Auftritt bei The Voice France 2023 und anschließend beim Lollapalooza Paris bringt ihre Musik einem größeren Publikum näher. Nach dem Erfolg von No anda sola erscheint 2024 die EP Tú conmigo und festigt einen Songwriting-Stil, der sich selbstverständlich zwischen Französisch und Spanisch bewegt.

Mit Luna Bohemia, ihrem ersten von Universal Music France vertriebenen Album, schlägt DOYA ein neues Kapitel auf. In zwölf Titeln treffen Wurzeln auf Bewegung, akustische Texturen auf Elektronik. Getragen von ihrer Verbundenheit lässt ihre Musik das Erbe in der Gegenwart tanzen. Zwei Stimmen, die einander antworten und tragen, bis sie zu einem einzigen Atem werden.'
),
(
  'ja',
  '姉妹。二つの声。一つの鼓動。',
  'MarinaとMélissaは、スペインにルーツを持つ家族のもとフランスで育ち、フラメンコを二人にとって最初の共通言語としてきました。タルブ音楽院で学び、ヴァイオリン、サクソフォン、パーカッションを身につけます。アンダルシアで過ごした10代の日々は、そこに歌、ギター、カホンを加えました。幼い頃から二人の音楽は、クラシックの規律、ポピュラー音楽の直感、そして自由の対話の中で形づくられてきました。

2018年、その絆はDOYAとなります。二つの声の力に、フラメンコ、ラテン、ポップ、エレクトロニックの色彩を重ねるデュオ。ステージでは二人の呼吸が瞬時に伝わります。スペインからポルトガル、Salle Pleyelからフランス各地のZénithまで、温かく、身体的で、精密なサウンドを育ててきました。

2023年のThe Voice France出演、そしてLollapalooza Parisでのパフォーマンスを経て、その音楽はより広い観客へ届きます。No anda solaの成功に続き、2024年にはEP「Tú conmigo」を発表。フランス語とスペイン語の間を自然に行き来するソングライティングを確立しました。

Universal Music Franceが流通を手がける初のアルバム「Luna Bohemia」で、DOYAは新たな章を開きます。全12曲で、ルーツと躍動、アコースティックな質感とエレクトロニクスが出会います。二人の絆に支えられた音楽は、受け継いだものを現代の中で踊らせる。呼応し、支え合う二つの声が、やがて一つの息づかいになります。'
),
(
  'ko',
  '두 자매. 두 목소리. 하나의 박동.',
  'Marina와 Mélissa는 스페인계 가족 안에서 프랑스에서 자랐고, 플라멩코를 두 사람이 처음 함께 나눈 언어처럼 품어 왔습니다. 타르브 음악원에서 바이올린, 색소폰, 퍼커션을 배웠고, 안달루시아에서 보낸 십 대 시절에는 노래, 기타, 카혼이 그 팔레트에 더해졌습니다. 처음부터 두 사람의 음악은 클래식의 규율, 대중음악의 본능, 자유가 서로 대화하는 자리에서 만들어졌습니다.

2018년, 그 유대는 DOYA가 됩니다. 두 목소리의 힘에 플라멩코, 라틴, 팝, 일렉트로닉의 색을 겹치는 듀오입니다. 무대에서는 두 사람의 호흡이 즉각적으로 전해집니다. 스페인에서 포르투갈까지, Salle Pleyel에서 프랑스의 Zénith 공연장까지, 따뜻하고 신체적이며 정교한 사운드를 다듬어 왔습니다.

2023년 The Voice France 출연과 이어진 Lollapalooza Paris 무대는 DOYA의 음악을 더 넓은 관객에게 알렸습니다. No anda sola의 성공 이후 2024년 EP Tú conmigo를 발표하며 프랑스어와 스페인어 사이를 자연스럽게 오가는 송라이팅을 확립했습니다.

Universal Music France가 유통하는 첫 정규 앨범 Luna Bohemia를 통해 DOYA는 새로운 장을 엽니다. 열두 곡 안에서 뿌리와 움직임, 어쿠스틱한 질감과 전자음이 만납니다. 두 사람의 유대가 이끄는 음악은 유산을 오늘의 리듬 속에서 춤추게 합니다. 서로 답하고 받쳐 주는 두 목소리는 마침내 하나의 숨결이 됩니다.'
),
(
  'zh',
  '两姐妹。两种声音。同一个脉搏。',
  'Marina 和 Mélissa 在法国一个西班牙家庭中长大，弗拉门戈是她们最早共同拥有的语言。她们在塔布音乐学院接受训练，学习小提琴、萨克斯和打击乐。青少年时期在安达卢西亚的生活，又让歌唱、吉他和卡洪鼓进入她们的音乐世界。从一开始，她们的音乐便诞生于古典训练、大众音乐直觉与自由之间的对话。

2018 年，这份连接成为 DOYA。这个二人组合把两种声音的力量与弗拉门戈、拉丁、流行和电子色彩融合在一起。舞台上，她们之间的默契几乎瞬间可感。从西班牙到葡萄牙，从 Salle Pleyel 到法国各地的 Zénith 场馆，她们逐渐形成了一种温暖、富有身体感且精准的声音语言。

2023 年参加 The Voice France，随后登上 Lollapalooza Paris 的舞台，让她们的音乐被更多人听见。继 No anda sola 获得成功后，EP《Tú conmigo》于 2024 年发行，也进一步确立了她们自然游走于法语与西班牙语之间的创作方式。

随着首张由 Universal Music France 发行的专辑《Luna Bohemia》，DOYA 开启了新的篇章。十二首作品中，根源与律动相遇，原声质感与电子声音彼此回应。由姐妹之间的连接所推动，她们让传承在当下继续舞动。两种声音彼此回答、彼此托举，最终汇成同一口呼吸。'
)
on conflict (locale) do nothing;
