PDF=InsightInk_Developer_Bible.pdf
BUILD=build

.PHONY: pdf clean

pdf:
	mkdir -p $(BUILD)
	latexmk -xelatex -interaction=nonstopmode -halt-on-error -outdir=$(BUILD) main.tex
	cp $(BUILD)/main.pdf $(PDF)

clean:
	rm -rf $(BUILD) preview
