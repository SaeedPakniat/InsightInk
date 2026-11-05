def _topic_name(topic, language):
    if language == "fa":
        return topic.name_fa
    return topic.name_en


def recommendation_reason(
    *,
    language,
    dominant_signal,
    topic=None,
    creator_name="",
):
    if language == "fa":
        if dominant_signal == "interest" and topic is not None:
            return f"چون موضوع «{_topic_name(topic, language)}» را انتخاب کرده‌اید."
        if dominant_signal == "save" and topic is not None:
            return f"چون ایده‌هایی درباره «{_topic_name(topic, language)}» ذخیره کرده‌اید."
        if dominant_signal == "spark" and topic is not None:
            return f"چون به ایده‌هایی درباره «{_topic_name(topic, language)}» اسپارک داده‌اید."
        if dominant_signal == "follow":
            return f"چون «{creator_name}» را دنبال می‌کنید."
        if dominant_signal == "popularity":
            return "چون میان خوانندگان اینسایت‌اینک محبوب است."
        if dominant_signal == "freshness":
            return "چون به‌تازگی منتشر شده است."
        return "یک ایده عمومی برای کشف بیشتر."

    if dominant_signal == "interest" and topic is not None:
        return f"Because you selected {_topic_name(topic, language)}."
    if dominant_signal == "save" and topic is not None:
        return f"Because you saved ideas about {_topic_name(topic, language)}."
    if dominant_signal == "spark" and topic is not None:
        return f"Because you sparked ideas about {_topic_name(topic, language)}."
    if dominant_signal == "follow":
        return f"Because you follow {creator_name}."
    if dominant_signal == "popularity":
        return "Because it is popular with InsightInk readers."
    if dominant_signal == "freshness":
        return "Because it was published recently."
    return "A public idea to explore."


def related_reason(*, idea_language, shared_topic, different_format):
    topic_name = _topic_name(shared_topic, idea_language)
    if idea_language == "fa":
        reason = f"موضوع مشترک: «{topic_name}»."
        if different_format:
            reason += " این بار در قالبی متفاوت."
        return reason

    reason = f"Shared topic: {topic_name}."
    if different_format:
        reason += " This time in a different format."
    return reason
