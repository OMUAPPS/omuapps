// https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition#events
interface SpeechRecognitionEventMap {
    audioend: Event;
    audiostart: Event;
    end: Event;
    error: SpeechRecognitionErrorEvent;
    nomatch: SpeechRecognitionEvent;
    result: SpeechRecognitionEvent;
    soundend: Event;
    soundstart: Event;
    speechend: Event;
    speechstart: Event;
    start: Event;
}

// https://wicg.github.io/speech-api/#speechreco-section
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    grammars: SpeechGrammarList;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    processLocally: boolean;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    abort(): void;
    start(audioTrack?: MediaStreamTrack): void;
    stop(): void;
    addEventListener<K extends keyof SpeechRecognitionEventMap>(
        type: K,
        listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof SpeechRecognitionEventMap>(
        type: K,
        listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
}

declare let SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
    available(options: SpeechRecognitionOptions): Promise<AvailabilityStatus>;
    install(options: SpeechRecognitionOptions): Promise<boolean>;
};

declare let webkitSpeechRecognition: typeof SpeechRecognition;

declare global {
    let SpeechRecognition: typeof SpeechRecognition;
    let webkitSpeechRecognition: typeof SpeechRecognition;
}
