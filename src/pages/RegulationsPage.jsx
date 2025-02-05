import BackButton from "../components/BackButton";

const Regulations = () => {
    return (
        <div className="container my-5">
            <h1 style={{ marginTop: "100px" }}>
                Regulamin Wydarzenia „STREET SHOW 2025”
            </h1>

            <section>
                <h2 className="text-uppercase">
                    §1
                    <br />
                    postanowienia ogólne
                </h2>
                <ol>
                    <li>
                        Organizatorem wydarzenia pn.: „Street Meeting Poland”,
                        zwanego dalej „ <strong>Imprezą</strong>”, jest Street
                        Meeting Poland Sp. z o.o. z siedzibą w Elblągu (82-300),
                        przy ul. Królewiecka 205/15, NIP 5783153201, zwana dalej
                        „ <strong>Organizatorem</strong>”.
                    </li>
                    <li>
                        Impreza odbywa się w dniach{" "}
                        <strong>31 maja 2025r.</strong> na terenie stadionu
                        Polsat Plus Arena Gdańsk, przy ul. Pokoleń Lechii Gdańsk
                        1, zwanym dalej „ <strong>Terenem Wydarzenia</strong>”.
                    </li>
                    <li>
                        Impreza ma charakter odpłatny. Dzieci{" "}
                        <strong>do lat 6</strong> wchodzą{" "}
                        <strong> za darmo</strong> za okazaniem dokumentu
                        potwierdzającego wiek.
                    </li>
                    <li>
                        Zakup biletu lub wejście na teren Wydarzenia jest
                        równoznaczne z akceptacją Regulaminu przez każdą osobę
                        korzystającą z biletu. Osoba dokonująca zakupu biletu
                        zobowiązana jest do poinformowania osób, którym
                        przekazuje bilet, o konieczności przestrzegania
                        Regulaminu.
                    </li>
                    <li>
                        Osoby przebywające na terenie Imprezy w dalszej części
                        Regulaminu zwane są „ <strong>Uczestnikami</strong>”.
                    </li>
                    <li>
                        Regulamin skierowany jest do każdej osoby przebywającej
                        na terenie Imprezy w trakcie jej trwania.
                    </li>
                    <li>
                        Celem Regulaminu jest zapewnienie bezpieczeństwa
                        Wydarzenia poprzez określenie zasad zachowania się
                        Uczestników Imprezy, uregulowanie ich praw i obowiązków
                        oraz zasad organizacyjnych.
                    </li>
                    <li>
                        Poprzez „ <strong>Bilet</strong>” należy rozumieć zgodę
                        Organizatora na uczestnictwo w Wydarzeniu. Bilet
                        upoważnia do wstępu na teren Wydarzenia.
                    </li>
                    <li>
                        Poprzez dowód tożsamości należy rozumieć dowód osobisty,
                        paszport, prawo jazdy, legitymację studencką, dokument
                        stwierdzający tożsamość cudzoziemca albo inny dokument
                        potwierdzający tożsamość zaopatrzony w wizerunek twarzy
                        i adres zamieszkania osoby nim się posługującej.
                    </li>
                    <li>
                        Poprzez „ <strong>Służby Porządkowe</strong>” i „{" "}
                        <strong>Służby Organizatora</strong>” należy rozumieć
                        osoby, legitymujące się identyfikatorem lub jednolitym
                        strojem ochrony (Służby Porządkowe), powołane przez
                        Organizatora do dbania o ład organizacyjny oraz
                        bezpieczeństwo Uczestników przebywających na terenie
                        Wydarzenia.
                    </li>
                </ol>
            </section>

            <section>
                <h2 className="text-uppercase">
                    §2
                    <br />
                    sprzedaż biletów
                </h2>
                <ol>
                    <li>
                        {" "}
                        <strong>Bilety sprzedawane</strong> są wyłącznie w
                        autoryzowanych punktach sprzedaży{" "}
                        <strong>(podczas Imprezy)</strong> oraz na stronie{" "}
                        <a
                            href="https://www.kupbilecik.pl/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            www.kupbilecik.pl
                        </a>
                        . Bilety mogą być sprzedawane wyłącznie po cenie
                        określonej przez Organizatora.
                    </li>
                    <li>
                        Każdy uczestnik posiadający Bilet lub dokonujący jego
                        zakupu przed Wydarzeniem, przy{" "}
                        <strong>pierwszym wejściu</strong> na teren Wydarzenia,{" "}
                        <strong>otrzyma</strong> na trwałe{" "}
                        <strong>Opaskę identyfikującą</strong> (zapinaną na
                        nadgarstku). Z jednej opaski może korzystać wyłącznie
                        jeden Uczestnik.{" "}
                        <strong>
                            W przypadku jej uszkodzenia traci ona ważność
                        </strong>
                        , a tym samym Uczestnik{" "}
                        <strong>
                            traci prawo do uczestniczenia w Wydarzeniu
                        </strong>
                        .
                    </li>
                    <li>
                        Zamianie na Opaskę podlega wyłącznie Bilet oryginalny,
                        nabyty zgodnie z postanowieniami niniejszego Regulaminu.
                        Bilet nabyty z naruszeniem postanowień Regulaminu może
                        być unieważniony przez Organizatora. Organizator
                        ostrzega, że kupno Biletów od osób postronnych niesie
                        ryzyko zakupu biletu podrobionego, co w konsekwencji
                        powoduje odmowę wymiany Biletu na Opaskę i wstępu na
                        Wydarzenie.
                    </li>
                    <li>
                        Zakupiony bilet nie może być bez zgody Organizatora
                        przedmiotem jakichkolwiek akcji reklamowych,
                        promocyjnych lub wykorzystywany do innych celów
                        komercyjnych.
                    </li>
                    <li>Zakupiony bilet nie podlega zwrotowi ani wymianie.</li>
                    <li>
                        Każdy z biletów występuje w opcji:
                        <ol className="alphanumeric">
                            <li>Normalnej</li>
                            <li>
                                Ulgowej - przysługuje dzieciom, młodzieży
                                szkolnej od 7 do 16 roku życia
                            </li>
                            <li>Bilet VIP</li>
                            <li>
                                2+1 – dwóch dorosłych oraz jedno dziecko, lub
                                dwójka dzieci i jeden dorosły
                            </li>
                        </ol>
                    </li>
                </ol>
            </section>

            <section>
                <h2 className="text-uppercase">
                    §3
                    <br />
                    Warunki uczestnictwa
                </h2>
                <ol>
                    <li>
                        Wstęp na Teren Wydarzenia, przysługuje wyłącznie osobie
                        posiadającej dowód tożsamości oraz Bilet lub zaproszenie
                        wydane przez Organizatora, które przy pierwszym wejściu
                        na Teren Wydarzenia zostanie wymienione na Opaskę.
                        <span className="underline">
                            Każdorazowe wejście na Teren Wydarzenia(w ramach
                            ważności Biletu) przysługuje tylko Uczestnikowi z
                            nieuszkodzoną Opaską umocowaną trwałe na ręku.
                        </span>
                    </li>
                    <li>
                        W przypadku, gdy{" "}
                        <strong>
                            Uczestnikiem Wydarzenia chce być małoletni w wieku
                            poniżej 15 lat
                        </strong>
                        , może on uczestniczyć w Imprezie wyłącznie
                        <span className="underline">
                            pod opieką osoby dorosłej, która w pełni ponosi
                            odpowiedzialność za podopiecznego.
                        </span>
                    </li>
                    <li>
                        {" "}
                        <strong>Zabrania się:</strong>
                        <ul className="alphanumeric">
                            <li>
                                wprowadzania psów i innych zwierząt na Teren
                                Imprezy, za wyjątkiem psów przewodników
                            </li>
                            <li>
                                wnoszenia napojów i jedzenia, z wyłączeniem osób
                                których stan zdrowia wymaga specjalistycznej
                                diety potwierdzonej orzeczeniem lekarskim.
                            </li>
                            <li>
                                wnoszenia, posiadania, a także używania nad
                                terenem imprezy, oraz w jego bliskim kontakcie
                                bezzałogowych statków powietrznych, dronów, oraz
                                innych obiektów unoszących się w powietrzu.
                                Pojazdów kołowych w tym hulajnóg, deskorolek,
                                urządzeń transportu osobistego (UTO) i innych w
                                tym urządzeń z napędem.
                            </li>
                            <li>
                                wnoszenia alkoholu nie zakupionego na terenie
                                Wydarzenia,
                            </li>
                            <li>
                                <span className="underline">
                                    prowadzenia sprzedaży, reklamy, roznoszenia
                                    materiałów reklamowych, tworzenia cyfrowych
                                    materiałów marketingowych pod kara grzywny{" "}
                                    <strong>(50.000 zł.)</strong>
                                    bez wcześniejszej zgody Organizatora.
                                </span>
                            </li>
                            <li>
                                prowadzenie przez Uczestników jakichkolwiek
                                działań komercyjnych, akwizycyjnych,
                                reklamowych, promocyjnych, a także agitacyjnych
                                oraz zbiórek pieniężnych nieuzgodnionych z
                                Organizatorem, jak również działań niezgodnych z
                                obowiązującymi przepisami prawa
                                <span className="underline">
                                    pod kara grzywny{" "}
                                    <strong>(50.000 zł.)</strong>
                                </span>
                            </li>
                            <li>
                                W przypadku złamania zakazu prowadzenia działań
                                promocyjnych, komercyjnych lub reklamowych na
                                terenie Wydarzenia przez osoby lub firmy bez
                                wcześniejszej zgody Organizatora, Organizator
                                zastrzega sobie prawo do:
                                <ul>
                                    <li>
                                        Natychmiastowego usunięcia tych osób z
                                        terenu Wydarzenia.
                                    </li>
                                    <li>
                                        Nałożenia kary umownej w wysokości 50
                                        000 zł, w celu pokrycia strat
                                        organizacyjnych i wizerunkowych.
                                    </li>
                                    <li>
                                        Skierowania sprawy na drogę sądową w
                                        przypadku nieuregulowania kary w
                                        terminie 14 dni od wezwania do zapłaty.
                                    </li>
                                    <li>
                                        Zawiadomienia odpowiednich służb, w
                                        przypadku podejrzenia naruszenia
                                        obowiązującego prawa.
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </li>
                    <li>
                        {" "}
                        <strong>
                            Organizator zastrzega sobie prawo odmówić wstępu na
                            Teren Wydarzenia osobie:
                        </strong>
                        <ul className="alphanumeric">
                            <li>
                                znajdującej się pod widocznym wpływem alkoholu,
                                środków odurzających, psychotropowych lub innych
                                podobnie działających środków,
                            </li>
                            <li>
                                osobie posiadającej broń lub inne niebezpieczne
                                przedmioty, materiały wybuchowe, wyroby
                                pirotechniczne, materiały pożarowo
                                niebezpieczne, środki odurzające lub substancje
                                psychotropowe,
                            </li>
                            <li>
                                osobie zachowującej się agresywnie,
                                prowokacyjnie albo w inny sposób stwarzającej
                                zagrożenie dla bezpieczeostwa lub porządku
                                publicznego,
                            </li>
                            <li>nie posiadającym Biletu-Opaski</li>
                            <li>
                                nie posiadającym dokumentu tożsamości
                                umożliwiającego ustalenie m.in. prawa do ulgi.
                            </li>
                            <li>
                                osobom, które odmawiają poddania się
                                czynnościom, o których mowa w §4
                            </li>
                        </ul>
                    </li>
                    <li>
                        {" "}
                        <strong>
                            Ocena przedmiotów i kwalifikowanie ich, jako
                            niebezpiecznych należy do Służb Porządkowych.
                        </strong>
                    </li>
                    <li>
                        {" "}
                        <strong>
                            Każde wejście na teren Wydarzenia, niezależnie od
                            sposobu uzyskania biletu, oznacza akceptację
                            Regulaminu przez osobę wchodzącą. Uczestnik
                            zobowiązuje się przestrzegać zasad określonych w
                            Regulaminie, który jest dostępny w punkcie sprzedaży
                            oraz na stronie internetowej Organizatora.
                        </strong>
                    </li>
                </ol>
            </section>

            <section>
                <h2 className="text-uppercase">
                    §4
                    <br />
                    zasady organizacyjne
                </h2>
                <ol>
                    <li>
                        Organizator zapewnia Uczestnikom Wydarzenia
                        bezpieczeństwo oraz porządek poprzez m.in.:
                        <ul className="alphanumeric">
                            <li>
                                Służby Porządkowe wyróżniające się elementami
                                ubioru;
                            </li>
                            <li>
                                udostępnienie pomocy medycznej oraz zaplecza
                                higieniczno-sanitarnego.
                            </li>
                        </ul>
                    </li>
                    <li>
                        Uczestnicy Wydarzenia zobowiązani są stosować się do
                        poleceń Służb Porządkowych oraz Służb Organizatora.
                        Odmowa zastosowania się do tych poleceń może wynikać
                        wyłącznie z uwagi na ich sprzeczność z powszechnie
                        obowiązującymi przepisami prawa w innych przypadkach nie
                        jest to akceptowane i może skutkować usunięciem z terenu
                        Wydarzenia.
                    </li>
                    <li>
                        Uczestnicy Wydarzenia zobowiązani są zachowywać się w
                        sposób niezagrażający bezpieczeństwu innych, a w
                        szczególności{" "}
                        <strong>
                            przestrzegać postanowień niniejszego regulaminu oraz
                            regulaminu obiektu
                        </strong>
                        , w którym odbywa się Wydarzenie. Zakazane jest
                        niszczenie oznaczeń i tablic informacyjnych, elementów
                        obiektu, nośników reklamowych, urządzeń i sprzętu
                        znajdującego się na Terenie Wydarzenia, itp., a
                        Uczestnicy Wydarzenia zobowiązani są korzystać z
                        pomieszczeń sanitarnych wyłącznie zgodnie z ich
                        przeznaczeniem.
                    </li>
                    <li>
                        Organizator nie ponosi odpowiedzialności za żadne szkody
                        poniesione przez Uczestników wskutek niestosowania się
                        do regulaminów, poleceń wydawanych przez służby
                        Organizatora, w tym również w sytuacjach zagrożeń
                        bezpieczeństwa osób i mienia.
                    </li>
                    <li>
                        {" "}
                        <strong>
                            Uczestnicy zobowiązani są bezwzględnie do:
                        </strong>
                        <ul className="alphanumeric">
                            <li>
                                respektowania oznaczeń, ciągów komunikacyjnych
                                oraz stref wydzielonych z ruchu podlegających
                                ochronie.
                            </li>
                            <li>
                                przestrzegania przepisów o ruchu drogowym, które
                                obowiązują w strefie ruchu ( każda strefa
                                Wydarzenia, gdzie zaistnieje ruch kołowy).
                            </li>
                        </ul>
                    </li>
                    <li>
                        {" "}
                        <strong>Uczestnikom zabrania się</strong> (chyba, że
                        właściciel obecny na miejscu zadecyduje inaczej):
                        <ul className="alphanumeric">
                            <li>dotykania aut wystawowych,</li>
                            <li>wsiadania do aut,</li>
                            <li>opierania się o karoserię,</li>
                            <li>Innych czynności mogących uszkodzić pojazd.</li>
                        </ul>
                    </li>
                    <li>
                        Uczestnik ponosi pełną odpowiedzialność za spowodowanie
                        lub wyrządzenie szkód na terenie Wydarzenia (np.
                        uszkodzenie mienia Street Meeting Poland lub wystawców).
                        Oceny szkód dokonuje Organizator, jeżeli to możliwe w
                        obecności Uczestnika lub jego przedstawiciela, co
                        zostanie potwierdzone w stosownym protokole.
                    </li>
                    <li>
                        O wystąpieniu szkody w mieniu lub na osobie Uczestnika
                        należy niezwłocznie powiadomić Służby Organizatora, co
                        zostanie potwierdzone stosownym protokołem.
                    </li>
                    <li>
                        {" "}
                        <strong>
                            Opiekunowie osób niepełnoletnich zobowiązani
                        </strong>
                        są do pełnej kontroli osób pozostających pod ich opieką
                        i ponoszą za nich pełną odpowiedzialność (w tym
                        finansową).
                    </li>
                    <li>
                        Uczestnicy oraz wszystkie osoby znajdujące się na
                        Terenie Wydarzenia zobowiązani są posiadać na ręku ważną
                        Opaskę. Brak Opaski identyfikującej lub posiadanie
                        Opaski
                        <span className="underline">
                            zerwanej lub uszkodzonej
                        </span>
                        ,
                        <span className="underline">
                            jak również nie zapiętej
                        </span>
                        na ręce jest jednoznaczną
                        <span className="underline">
                            podstawą do usunięcia uczestnika z Terenu Wydarzenia
                        </span>
                        .{" "}
                        <strong>
                            Samodzielne opuszczenie terenu Wydarzenia z
                            uszkodzoną lub zerwaną Opaską jest równoznaczne z
                            rezygnacją z uczestnictwa w Wydarzeniu.
                        </strong>
                    </li>
                    <li>
                        Wszyscy Uczestnicy Wydarzenia, w trakcie trwania
                        Wydarzenia, zobowiązani są do posiadania i każdorazowego
                        okazywania Opaski Identyfikującej, legitymacji lub
                        dowodu tożsamości na żądania Organizatora.
                    </li>
                    <li>
                        {" "}
                        <strong>Służby Porządkowe są uprawnione do:</strong>
                        <ul className="alphanumeric">
                            <li>
                                sprawdzania uprawnień do przebywania na
                                Wydarzeniu, a w przypadku stwierdzenia braku
                                takich uprawnień - wezwania do opuszczenia
                                Wydarzenia,
                            </li>
                            <li>egzekwowania zapisów §3</li>
                            <li>
                                przeglądania zawartości bagaży, odzieży osób, w
                                przypadku podejrzenia, że osoby te wnoszą lub
                                posiadają przedmioty, o których mowa w §3,
                            </li>
                            <li>
                                legitymowania osób w celu ustalenia ich
                                tożsamości i prawa do ulg.
                            </li>
                            <li>
                                wydawania poleceń porządkowych Uczestnikom
                                zakłócającym porządek publiczny lub zachowującym
                                się niezgodnie z Regulaminem Wydarzenia lub
                                obiektu, a w przypadku niewykonania tych poleceń
                                – wezwania ich do opuszczenia Wydarzenia,
                            </li>
                            <li>
                                stosowania siły fizycznej w postaci chwytów
                                obezwładniających oraz podobnych technik obrony
                                w przypadku zagrożenia dóbr powierzonych
                                ochronie lub odparcia ataku na członka Służb
                                Porządkowych, lub inną osobę, na zasadach
                                określonych w art. 38 ustawy z dnia 22 sierpnia
                                1997 r. o ochronie osób i mienia (Dz. U. Nr 114,
                                poz. 740, z późn. zm.),
                            </li>
                            <li>
                                ujęcia, w celu niezwłocznego przekazania
                                Policji, osób stwarzających bezpośrednie
                                zagrożenie dla życia lub zdrowia ludzkiego, a
                                także chronionego mienia.
                            </li>
                        </ul>
                    </li>
                    <li>
                        Członkowie Służb Porządkowych, w zależności od
                        potencjalnego ryzyka i potrzeb, mogą być wyposażeni
                        m.in. w niezbędne i prawnie dozwolone środki ochrony
                        osobistej.
                    </li>
                    <li>
                        Organizator nie ponosi odpowiedzialności za jakiekolwiek
                        przedmioty zgubione przez Uczestników na terenie
                        Wydarzenia. Organizator nie prowadzi depozytu.
                    </li>
                    <li>
                        Na terenie Wydarzenia, <strong>wewnątrz budynku</strong>
                        , obowiązuje surowy{" "}
                        <strong>zakaz palenia wyrobów tytoniowych</strong>.
                        Palenie może obywać się jedynie w miejscach do tego
                        wyznaczonych.
                    </li>
                    <li>
                        {" "}
                        <strong>
                            Biorąc udział w Wydarzeniu Uczestnik wyraża zgodę na
                            korzystanie przez Organizatora z wizerunku
                            utrwalonego
                        </strong>
                        w związku z realizacją Wydarzenia oraz przenosi na
                        Organizatora w zakresie nieograniczonym czasowo i
                        terytorialnie wszelkie prawa do korzystania i
                        rozporządzania wizerunkiem Uczestnika i jego nagraniami
                        (fotograficznymi, audiowizualnymi, dźwiękowymi)
                        zarejestrowanymi w związku z Wydarzeniem. Wizerunek
                        Uczestnika, który został w ww. sposób utrwalony i
                        wykorzystany nie przysługują jakiekolwiek (w tym
                        finansowe) roszczenia z tego tytułu. Organizator
                        zastrzega sobie prawo do udzielenia sublicencji na
                        wykorzystanie utrwalonego wizerunku Uczestnika
                        oficjalnym partnerom oraz sponsorom.
                    </li>
                </ol>
            </section>

            <section>
                <h2 className="text-uppercase">
                    §5
                    <br />
                    dane osobowe
                </h2>
                <ol>
                    <li>
                        Street Meeting Poland Sp. z o.o. z siedzibą w Elblągu
                        (82-300), przy ul. Królewiecka 205/15, NIP 5783153201,
                        (dane do kontaktu: e-mail,
                        streetmeetingpolska@gmail.com) informuje, że jest
                        administratorem danych osobowych Uczestników.
                    </li>
                    <li>
                        Dane osobowe Uczestnika przetwarzane są w celu:
                        <ul className="alphanumeric">
                            <li>
                                uczestnictwa w Wydarzeniu, konkursach, zgodnie z
                                Regulaminem,
                            </li>
                            <li>
                                rozpatrywania reklamacji zgłoszonych przez
                                Uczestnika,
                            </li>
                            <li>
                                wypełnienia obowiązków prawnych wynikających w
                                szczególności z prawa podatkowego,
                            </li>
                            <li>dochodzenia roszczeń.</li>
                            <li>statystycznym</li>
                            <li>oferowania produktów handlowych,</li>
                            <li>marketingowym</li>
                        </ul>
                    </li>
                    <li>
                        Uczestnikowi przysługuje prawo do żądania od Firmy
                        Street Meeting Poland sp. z o.o. dostępu do podanych
                        danych osobowych, ich sprostowania np. w sytuacji, gdy
                        są nieprawidłowe lub niekompletne, a także ich usunięcia
                        lub ograniczenia przetwarzania, jak również prawo do
                        wniesienia sprzeciwu wobec przetwarzania danych oraz
                        prawo do przeniesienia danych do innego administratora,
                        a także prawo do odwołania wyrażonej wcześniej zgody na
                        przetwarzanie danych w każdym momencie.
                        <span className="underline">
                            Odwołanie zgody nie wpłynie na zgodność
                            przetwarzania danych Uczestnika, którego dokonano na
                            podstawie zgody udzielonej przed jej cofnięciem.
                        </span>
                    </li>
                    <li>
                        Uczestnikowi przysługuje prawo do wniesienia skargi do
                        Prezesa Urzędu Ochrony Danych Osobowych.
                    </li>
                    <li>
                        Podanie przez Uczestnika danych osobowych jest niezbędne
                        do realizacji usługi, w tym obsługi procesu reklamacji.
                        <span className="underline">
                            Odmowa podania przez Uczestnika danych osobowych
                            uniemożliwi udział w Wydarzeniu
                        </span>
                        , a także realizację reklamacji zgłoszonej przez
                        Uczestnika czy realizację obowiązków ustawowych przez
                        Firmę Street Meeting Poland.
                    </li>
                </ol>
            </section>
            <section>
                <h2 className="text-uppercase">
                    §6
                    <br />
                    Postanowienia końcowe
                </h2>
                <ol>
                    <li>
                        Wszelkie prawa do nazwy i logo Wydarzenia są zastrzeżone
                        na rzecz Organizatora.
                    </li>
                    <li>
                        Organizator zastrzega sobie prawo do zmiany regulaminu i
                        programu wydarzenia, w każdym momencie bez podawania
                        przyczyny, o czym poinformuje na stronie{" "}
                        <a
                            href="http://streetshow.pl"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            www.streetshow.pl
                        </a>{" "}
                        lub/i na profilu społecznościowym wydarzenia.
                        Uczestnikom nie przysługuje prawo roszczeń z tego
                        tytułu.
                    </li>
                    <li>
                        Każda osoba przebywająca na terenie Wydarzenia
                        zobowiązana jest do przestrzegania niniejszego
                        Regulaminu, niezależnie od tego, czy osobiście zakupiła
                        bilet, czy otrzymała go od innej osoby. Organizator nie
                        ponosi odpowiedzialności za brak znajomości regulaminu
                        przez Uczestników.
                    </li>
                    <li>
                        Niniejszy Regulamin jest dostępny na stronie
                        internetowej Imprezy:{" "}
                        <a
                            href="http://streetshow.pl"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            www.streetshow.pl
                        </a>{" "}
                        oraz w kasach na Terenie Wydarzenia.
                    </li>
                    <li>
                        Gadżety dotyczące Wydarzenia będą sprzedawane wyłącznie
                        na Terenie Wydarzenia w dedykowanym Sklepiku.
                    </li>
                    <li>
                        Organizator nie ponosi odpowiedzialności za skutki
                        działania siły wyższej oraz niezależną od Organizatora
                        przerwą w dostawie wody, prądu w wyniku, której nastąpi
                        przerwanie Wydarzenia.
                    </li>
                    <li>
                        Organizator informuje, iż Uczestnicy Wydarzenia mogą
                        podczas jej trwania znajdować się pod wpływem silnych
                        bodźców zewnętrznych w tym świetlnych, dźwiękowych o
                        natężeniu dopuszczonym prawem, jednak znacząco wyższym,
                        niż normalnie spotykane w codziennym życiu. Osoby
                        samodzielnie podejmują decyzję o uczestnictwie w
                        Wydarzeniu i nie mogą z tego tytułu zgłaszać względem
                        Organizatora jakichkolwiek roszczeń.
                    </li>
                    <li>
                        W sprawach nieuregulowanych w Regulaminie, decyzje
                        podejmuje Organizator oraz stosuje się odpowiednie
                        przepisy Prawa.
                    </li>
                </ol>
            </section>
            <BackButton />
        </div>
    );
};

export default Regulations;
