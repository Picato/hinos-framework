package main

import (
	"encoding/json"
	"errors"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"

	"log"
	"os"
	"strings"

	"github.com/nfnt/resize"
	"github.com/oliamb/cutter"
)

type sizeImage struct {
	W   uint   `json:"w"`
	H   uint   `json:"h"`
	Ext string `json:"ext"`
}

type sizeImages struct {
	Path  string       `json:"path"`
	Sizes *[]sizeImage `json:"sizes"`
}

func resizeImage(sizeImages *sizeImages) {
	file, err := os.Open(sizeImages.Path)
	if err != nil {
		log.Fatal(err)
	}
	var img image.Image
	if strings.HasSuffix(sizeImages.Path, ".jpg") || strings.HasSuffix(sizeImages.Path, ".jpeg") {
		img, err = jpeg.Decode(file)
	} else if strings.HasSuffix(sizeImages.Path, ".png") {
		img, err = png.Decode(file)
	} else if strings.HasSuffix(sizeImages.Path, ".gif") {
		img, err = gif.Decode(file)
	} else {
		log.Fatal(errors.New("Not support image type"))
	}
	if err != nil {
		log.Fatal(err)
	}
	file.Close()
	for _, p := range *sizeImages.Sizes {
		var w, h uint
		imgW, imgH := uint(img.Bounds().Dx()), uint(img.Bounds().Dy())
		isCrop := false
		if p.W > 0 || p.H > 0 {
			if p.W > 0 {
				w = p.W
				h = w * imgH / imgW
			}
			if p.H > 0 || h < p.H {
				h = p.H
				w = h * imgW / imgH
			}
			isCrop = h != p.H || w != p.W
		}
		m := resize.Resize(w, h, img, resize.Lanczos3)
		if isCrop {
			m, err = cutter.Crop(m, cutter.Config{
				Width:   int(p.W),
				Height:  int(p.H),
				Options: cutter.Copy,
				Mode:    cutter.Centered,
			})
			if err != nil {
				log.Fatal(err)
			}
		}
		fout := sizeImages.Path[0:strings.LastIndex(sizeImages.Path, ".")] + p.Ext + sizeImages.Path[strings.LastIndex(sizeImages.Path, "."):]
		out, err1 := os.Create(fout)
		if err1 != nil {
			log.Fatal(err1)
		}
		defer out.Close()
		jpeg.Encode(out, m, nil)
	}
}

func main() {
	if len(os.Args) > 0 {
		arg := os.Args[1]
		_sizeImages := &sizeImages{}
		err := json.Unmarshal([]byte(arg), _sizeImages)
		if err != nil {
			log.Fatal(err)
		}
		resizeImage(_sizeImages)
	}
}
