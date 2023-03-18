function getWeeksOfCurrentMonth() {
	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

	const startDate = new Date(currentYear, currentMonth, 1);
	const endDate = new Date(currentYear, currentMonth + 1, 0);

	const weekRanges = [];

	if (startDate.getDay() !== 0) {
		const firstWeekStartDate = new Date(startDate);
		const firstWeekEndDate = new Date(startDate);

		firstWeekEndDate.setDate(
			firstWeekEndDate.getDate() + (6 - startDate.getDay())
		);
		weekRanges.push(
			`${moment(firstWeekStartDate).format('YYYY-MM-DD')} to ${moment(
				firstWeekEndDate
			).format('YYYY-MM-DD')}`
		);
	}

	for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
		if (d.getDay() === 0) {
			const weekStartDate = new Date(d);
			let weekEndDate = new Date(d);
			weekEndDate.setDate(weekEndDate.getDate() + 6);
			if (weekEndDate.getMonth() > currentMonth) {
				weekEndDate = endDate;
			}
			weekRanges.push(
				`${moment(weekStartDate).format('YYYY-MM-DD')} to ${moment(
					weekEndDate
				).format('YYYY-MM-DD')}`
			);
		}
	}

	return weekRanges;
}

function appendWeekRangesInSelectTag(weekRanges, selectElement) {
	for (const weekRange of weekRanges) {
		const option = document.createElement('option');
		option.value = weekRange;
		option.text = weekRange;
		selectElement.add(option);
	}
}

let weekRanges = getWeeksOfCurrentMonth();

let selectTagForWeeks = document.getElementById('weeks-select');
selectTagForWeeks.addEventListener('change', function (e) {
	selectedWeek = e.target.value;
});

let startTrackingButton = document.getElementById('start-tracking');
startTrackingButton.addEventListener('click', getWeatherDetails);

appendWeekRangesInSelectTag(weekRanges, selectTagForWeeks);

function appendDataInWeatherTable(tbodyElement, dayObj) {
	let newRow = document.createElement('tr');

	let dayCell = document.createElement('td');
	let dateCell = document.createElement('td');
	let minTemperatureCell = document.createElement('td');
	let maxTemperatureCell = document.createElement('td');

	dayCell.textContent = dayObj.day;
	dateCell.textContent = dayObj.date;
	minTemperatureCell.textContent = dayObj.minTemperature;
	maxTemperatureCell.textContent = dayObj.maxTemperature;

	newRow.appendChild(dayCell);
	newRow.appendChild(dateCell);
	newRow.appendChild(minTemperatureCell);
	newRow.appendChild(maxTemperatureCell);

	tbodyElement.appendChild(newRow);
}

var jsonData = [];
var selectedWeek = selectTagForWeeks.value;

async function getWeatherDetails(updateDom = true) {
	if (selectedWeek) {
		let startDateOfWeek = selectedWeek.split('to')[0];
		let endDateOfWeek = selectedWeek.split('to')[1];

		let weatherTableElement = document.getElementById('weather-details-table');
		let weatherTableBodyElement =
			weatherTableElement.getElementsByTagName('tbody')[0];
		let weatherErrorElement = document.getElementById('weather-details-error');

		startTrackingButton.disabled = true;
		try {
			let { data } = await axios.get(
				`https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&timezone=America/New_York&daily=temperature_2m_max,temperature_2m_min&start_date=${startDateOfWeek.trim()}&end_date=${endDateOfWeek.trim()}`
			);

			if (data) {
				jsonData = [];

				weatherTableBodyElement.innerHTML = '';
				data.daily.time.forEach((value, index) => {
					let dayObj = {
						day: moment(value, 'YYYY-MM-DD').format('dddd'),
						date: value,
						minTemperature: data.daily.temperature_2m_min[index] || 'NA',
						maxTemperature: data.daily.temperature_2m_max[index] || 'NA',
					};

					if (updateDom) {
						appendDataInWeatherTable(weatherTableBodyElement, dayObj);
					}
					jsonData.push(dayObj);
				});

				if (updateDom) {
					weatherErrorElement.classList.add('d-none');
					weatherTableElement.classList.remove('d-none');
				}
				generateXmlButton.classList.remove('d-none');
				return jsonData;
			}
		} catch (error) {
			weatherTableElement.classList.add('d-none');
			generateXmlButton.classList.add('d-none');
			weatherErrorElement.classList.remove('d-none');
		} finally {
			startTrackingButton.disabled = false;
		}
	}
}

let generateXmlButton = document.getElementById('generate-xml');
generateXmlButton.addEventListener('click', generateXml);

async function generateXml() {
	if (jsonData.length >= 1) {
		jsonData = await getWeatherDetails(false);
	}
	let xml = '';
	jsonData.forEach((data) => {
		xml += `<temperature>
      <day>${data.day}</day>
      <date>
        <dateValue>${data.date}</dateValue>
        <dateFormat>YYYY-MM-dd</dateFormat>
      </date>
      <min>${data.minTemperature}</min>
      <max>${data.maxTemperature}</max>
    </temperature>`;
	});
	var blob = new Blob([xml], { type: 'text/xml;charset=utf-8' });
	let fileName = selectedWeek.trim().replace(' ', '_') + '.xml';
	const loc = window.location.pathname;
	const dir = loc.substring(0, loc.lastIndexOf('/')) + fileName;
	writeFile(dir, blob);
}

function writeFile(fileName, blob) {
	window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
	window.requestFileSystem(window.TEMPORARY, 1024 * 1024, function (fs) {
		fs.root.getFile(fileName, { create: true }, function (fileEntry) {
			fileEntry.createWriter(function (writer) {
				writer.write(blob);
			});
		});
	}, err => {
		console.log(err)
	});
}
